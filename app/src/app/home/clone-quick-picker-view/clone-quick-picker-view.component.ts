import { Component, OnInit, Input } from '@angular/core';
import * as d3 from 'd3';
import { PopoverController } from '@ionic/angular';
import { CloneInstanceMenuViewComponent } from '../clone-instance-menu-view/clone-instance-menu-view.component';
import { CloneReport, CloneInstance } from 'src/app/data-structures/clone-report';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-clone-quick-picker-view',
  templateUrl: './clone-quick-picker-view.component.html',
  styleUrls: ['./clone-quick-picker-view.component.scss'],
})
export class CloneQuickPickerViewComponent implements OnInit {

  private _cloneReport: CloneReport;
  get cloneReport() {
    return this._cloneReport;
  }
  @Input() set cloneReport(value: CloneReport) {
    this._cloneReport = value;
    this.initialize();
  }

  frequentlyChangedCloneList: CloneInstance[];

  @Input() gitRepositoryPath: string;

  private _cloneListMaxCount: number;
  get cloneListMaxCount() {
    return this._cloneListMaxCount;
  }
  @Input() set cloneListMaxCount(value: number) {
    this._cloneListMaxCount = value;
    if (this.cloneReport) {
      this.initialize();
    }
  }

  private _brushedData = [];
  get brushedData() {
    return this._brushedData;
  }
  @Input() set brushedData(value: any[]) {
    this._brushedData = value || [];
    if (this.cloneReport) {
      this.initialize();
    }
  }

  @Input() generateEditorhandler: (filePath: string, language: string, startLine?: number, endLine?: number) => void;

  constructor(private electronService: ElectronService, private popoverController: PopoverController) { }

  ngOnInit() { }

  initialize() {
    this.frequentlyChangedCloneList = [];

    const globalIdChangeFrequencyMap = new Map<number, number>();

    for (const revisionNode of Object.values(this.cloneReport.globalIdDictionary)) {
      if (revisionNode[this.cloneReport.info.maxRevision]) {
        for (const clone of Object.values(revisionNode) as CloneInstance[]) {
          if (clone.change_count > 0) {
            globalIdChangeFrequencyMap.set(
              clone.global_id,
              globalIdChangeFrequencyMap.get(clone.global_id) ?
                globalIdChangeFrequencyMap.get(clone.global_id) + 1 : 1
            );
          } else {
            if (!globalIdChangeFrequencyMap.get(clone.global_id)) {
              globalIdChangeFrequencyMap.set(clone.global_id, 0);
            }
          }
        }
      }
    }

    const globalIdChangeFrequencyList = Array.from(globalIdChangeFrequencyMap).filter(d => this.brushedData.find(dt => +dt.id === d[0])).sort((a, b) => b[1] - a[1]);
    for (const item of globalIdChangeFrequencyList) {
      const globalId = item[0];
      const clone = this.cloneReport.globalIdDictionary[globalId][this.cloneReport.info.maxRevision];
      clone.global_change_count = item[1];
      this.frequentlyChangedCloneList.push(clone);
    }
    this.frequentlyChangedCloneList = this.frequentlyChangedCloneList.slice(0, this.cloneListMaxCount);
  }

  async showCloneItemOptions(ev: any, clone) {
    ev.preventDefault();
    const popover = await this.popoverController.create({
      component: CloneInstanceMenuViewComponent,
      event: ev,
      translucent: true,
      id: 'clone-instance-menu-popover',
      componentProps: {
        gitRepositoryPath: this.gitRepositoryPath,
        filePath: clone.file,
        language: null,
        startLine: clone.start_line,
        endLine: clone.end_line,
        generateEditorhandler: this.generateEditorhandler
      }
    });
    popover.present();
  }

  pickAFile() {
    let path: any = this.electronService.remote.dialog.showOpenDialog({
      title: 'Select File',
      defaultPath: this.gitRepositoryPath,
      properties: ['openFile']
    });
    path = path ? path[0].replace(/\\/g, '/') : path;

    if (path) {
      this.generateEditorhandler(path, null);
    }
  }

}
