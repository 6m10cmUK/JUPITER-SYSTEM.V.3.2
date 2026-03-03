import { StatusResultDto } from '../../application/dto/StatusDto';

export interface StatusViewModel extends StatusResultDto {
    messageId?: string;
    userId?: string;
    showCustomMenu?: boolean;
}
