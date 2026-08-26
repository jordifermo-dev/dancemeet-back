import { FilterQuery, Model } from 'mongoose';
import { mapAttendanceToDto } from '../../config/mongoose.config';
import { AttendanceDto, CreateAttendanceDto } from './attendance.dto';
import { AttendanceDocument } from './attendance.schema';
import { handleDbOperation } from '../../common';

export class AttendanceRepository {
  private readonly resourceName = 'Attendance';

  constructor(private readonly attendanceModel: Model<AttendanceDocument>) {}

  async create(attendanceData: CreateAttendanceDto): Promise<AttendanceDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.attendanceModel.create({
        ...attendanceData,
        createdAt: attendanceData.createdAt ?? Date.now(),
      });
      return mapAttendanceToDto(createdDocument);
    });
  }

  async findByUser(userId: string): Promise<AttendanceDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.attendanceModel.find({ userId }).lean();
      return documents.map((document) => mapAttendanceToDto(document));
    });
  }

  async findByEvent(eventId: string): Promise<AttendanceDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.attendanceModel.find({ eventId }).lean();
      return documents.map((document) => mapAttendanceToDto(document));
    });
  }

  async findByUserAndEvent(userId: string, eventId: string): Promise<AttendanceDto | null> {
    return handleDbOperation(this.resourceName, 'findByUserAndEvent', async () => {
      const document = await this.attendanceModel.findOne({ userId, eventId }).lean();
      return document ? mapAttendanceToDto(document) : null;
    });
  }

  async deleteByUserAndEvent(userId: string, eventId: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteByUserAndEvent', async () => {
      await this.attendanceModel.deleteOne({ userId, eventId });
    });
  }

  /** Used by the "whole series" attend toggle to know which instances a user
   * is already attending, so attending the series only creates the missing
   * ones instead of erroring on the duplicates. */
  async findByUserAndEvents(userId: string, eventIds: string[]): Promise<AttendanceDto[]> {
    return handleDbOperation(this.resourceName, 'findByUserAndEvents', async () => {
      const documents = await this.attendanceModel.find({ userId, eventId: { $in: eventIds } }).lean();
      return documents.map((document) => mapAttendanceToDto(document));
    });
  }

  async deleteManyByUserAndEvents(userId: string, eventIds: string[]): Promise<number> {
    return handleDbOperation(this.resourceName, 'deleteManyByUserAndEvents', async () => {
      const result = await this.attendanceModel.deleteMany({ userId, eventId: { $in: eventIds } });
      return result.deletedCount ?? 0;
    });
  }

  async count(filter: FilterQuery<AttendanceDocument> = {}): Promise<number> {
    return handleDbOperation(this.resourceName, 'count', async () => {
      return this.attendanceModel.countDocuments(filter);
    });
  }

  async updateLastReadChatAt(userId: string, eventId: string, timestamp: number): Promise<void> {
    await handleDbOperation(this.resourceName, 'updateLastReadChatAt', async () => {
      await this.attendanceModel.findOneAndUpdate({ userId, eventId }, { $set: { lastReadChatAt: timestamp } });
    });
  }
}
