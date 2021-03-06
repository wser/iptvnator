export interface EpgProgram {
    start: string;
    stop: string;
    channel: string;
    title: { lang: string; value: string }[];
    desc: any[];
    category: any[];
    date: any[];
    episodeNum: any[];
    previouslyShown: any[];
    subtitles: any[];
    icon: any[];
    rating: { system: string; value: string }[];
    credits: any[];
    audio: any[];
}
