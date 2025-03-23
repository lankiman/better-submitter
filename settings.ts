import { AssignmentNumber, EnableSubmission } from "./interface";

export class Settings {
  public enable_submission: EnableSubmission;
  public assignment_number: AssignmentNumber;
  public max_video_file_size: number;
  public max_code_file_size: number;

  private readonly API_URL = import.meta.env.VITE_API_URL;

  constructor() {}

  private async getSettings() {}
}
