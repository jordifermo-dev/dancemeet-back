import { EventTypeRepository } from '../repositories';
import { CreateEventTypeDto, EventTypeDto, UpdateEventTypeDto } from '../dto';
import { ResourceNotFoundException } from '../common';

export class EventTypeService {
  constructor(private readonly eventTypeRepository: EventTypeRepository) {}

  /**
   * Create a new event type
   */
  async createEventType(eventTypeData: CreateEventTypeDto): Promise<EventTypeDto> {
    try {
      return await this.eventTypeRepository.create(eventTypeData);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get event type by ID
   */
  async getEventTypeById(eventTypeId: string): Promise<EventTypeDto> {
    try {
      const eventType = await this.eventTypeRepository.findById(eventTypeId);
      if (!eventType) {
        throw new ResourceNotFoundException('EventType', eventTypeId);
      }
      return eventType;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all event types
   */
  async getAllEventTypes(): Promise<EventTypeDto[]> {
    try {
      return await this.eventTypeRepository.findAll();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update event type
   */
  async updateEventType(eventTypeId: string, updateData: UpdateEventTypeDto): Promise<boolean> {
    try {
      const updated = await this.eventTypeRepository.update(eventTypeId, updateData);
      if (!updated) {
        throw new ResourceNotFoundException('EventType', eventTypeId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Delete event type
   */
  async deleteEventType(eventTypeId: string): Promise<boolean> {
    try {
      const deleted = await this.eventTypeRepository.delete(eventTypeId);
      if (!deleted) {
        throw new ResourceNotFoundException('EventType', eventTypeId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find event type by name
   */
  async getEventTypeByName(name: string): Promise<EventTypeDto> {
    try {
      const eventType = await this.eventTypeRepository.findByName(name);
      if (!eventType) {
        throw new ResourceNotFoundException(
          'EventType',
          `name "${name}"`,
          'errors.RESOURCE_NOT_FOUND_BY_NAME',
          { resource: 'EventType', name },
        );
      }
      return eventType;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count all event types
   */
  async countEventTypes(): Promise<number> {
    try {
      return await this.eventTypeRepository.count();
    } catch (err) {
      throw err;
    }
  }
}
