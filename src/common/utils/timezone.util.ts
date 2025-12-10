export class TimezoneUtil {
  static getNigeriaTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + (60 * 60 * 1000)); // UTC+1
  }

  static addTimeToNigeriaTime(milliseconds: number): Date {
    const nigeriaTime = this.getNigeriaTime();
    return new Date(nigeriaTime.getTime() + milliseconds);
  }
}