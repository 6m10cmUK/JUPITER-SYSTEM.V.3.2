import { StatusServiceVer6 } from './StatusServiceVer6';
import { StatusServiceVer7 } from './StatusServiceVer7';
import { BaseStatusService } from './BaseStatusService';

export class StatusServiceFactory {
    static create(version: '6' | '7'): BaseStatusService {
        switch (version) {
            case '6':
                return new StatusServiceVer6();
            case '7':
                return new StatusServiceVer7();
            default:
                throw new Error(`Unknown status version: ${version}`);
        }
    }
}