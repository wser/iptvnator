import { Component, NgZone } from '@angular/core';
import { EpgChannel } from '../../models/epg-channel.model';
import { EpgProgram } from '../../models/epg-program.model';
import * as moment from 'moment';
import { ElectronService } from '../../../services/electron.service';
import { EPG_GET_PROGRAM_DONE } from '../../../shared/ipc-commands';
import { ChannelStore } from '../../../state';

export interface EpgData {
    channel: EpgChannel;
    items: EpgProgram[];
}

@Component({
    selector: 'app-epg-list',
    templateUrl: './epg-list.component.html',
    styleUrls: ['./epg-list.component.scss'],
})
export class EpgListComponent {
    /** Channel info in EPG format */
    channel: EpgChannel;

    /** Today as formatted date string */
    dateToday: string;

    /** Array with EPG programs */
    items: EpgProgram[] = [];

    /** Object with epg programs for the active channel */
    programs: {
        payload: EpgData;
    };

    /** EPG selected program */
    playingNow: EpgProgram;

    /** Current time as formatted string */
    timeNow: string;

    selectedDate: string;

    /**
     * Creates an instance of EpgListComponent
     * @param electronService
     * @param ngZone
     */
    constructor(
        private channelStore: ChannelStore,
        private electronService: ElectronService,
        private ngZone: NgZone
    ) {
        this.electronService.ipcRenderer.on(
            EPG_GET_PROGRAM_DONE,
            (event, response) => {
                this.ngZone.run(() => this.handleEpgData(response));
            }
        );
    }

    /**
     * Handles incoming epg programs for the active channel from the main process
     * @param programs
     */
    handleEpgData(programs: { payload: EpgData }): void {
        if (programs.payload?.items?.length > 0) {
            this.programs = programs;
            this.timeNow = moment(Date.now()).format('HH:mm');
            this.dateToday = moment(Date.now()).format('YYYYMMDD');
            this.channel = programs.payload?.channel;
            this.items = this.selectPrograms(programs);

            this.setPlayingNow();
        } else {
            this.items = [];
            this.channel = null;
        }
    }

    /**
     * Selects the program based on the active date
     * @param programs object with all available epg programs for the active channel
     */
    selectPrograms(programs: { payload: EpgData }): EpgProgram[] {
        return programs.payload?.items
            .filter((item) => item.start.includes(this.dateToday.toString()))
            .map((program) => ({
                ...program,
                start: moment(program.start, 'YYYYMMDDHHmm ZZ').format('HH:mm'),
                stop: moment(program.stop, 'YYYYMMDDHHmm ZZ').format('HH:mm'),
            }))
            .sort((a, b) => {
                return a.start.localeCompare(b.start);
            });
    }

    /**
     * Changes the date to update the epg list with programs
     * @param direction direction to switch
     */
    changeDate(direction: 'next' | 'prev'): void {
        let dateToSwitch;
        if (direction === 'next') {
            dateToSwitch = moment(this.dateToday, 'YYYYMMDD')
                .add(1, 'days')
                .format('YYYYMMDD');
        } else if (direction === 'prev') {
            dateToSwitch = moment(this.dateToday, 'YYYYMMDD')
                .subtract(1, 'days')
                .format('YYYYMMDD');
        }
        this.dateToday = dateToSwitch;
        this.items = this.selectPrograms(this.programs);
    }

    /**
     * Sets the playing now variable based on the current time
     */
    setPlayingNow(): void {
        this.playingNow = this.items.find(
            (item) => this.timeNow >= item.start && this.timeNow <= item.stop
        );
    }

    /**
     * Sets the provided epg program as active and starts to play
     * @param program epg program to set
     * @param isLive live stream flag
     */
    setEpgProgram(program: EpgProgram, isLive?: boolean): void {
        isLive
            ? this.channelStore.resetActiveEpgProgram()
            : this.channelStore.setActiveEpgProgram(program);
        this.playingNow = program;
    }

    /**
     * Removes all ipc renderer listeners after destroy
     */
    ngOnDestroy(): void {
        this.electronService.ipcRenderer.removeAllListeners(
            EPG_GET_PROGRAM_DONE
        );
    }
}
