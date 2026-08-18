import { EventTypeRepository } from '../repositories';
import { CreateEventTypeDto, EventTypeDto, UpdateEventTypeDto } from '../dto';
import { ResourceNotFoundException } from '../common';

export class EventTypeService {
  constructor(private readonly eventTypeRepository: EventTypeRepository) {}

  /**
   * Create a new event type
   */
  async createEventType(eventTypeData: CreateEventTypeDto): Promise<EventTypeDto> {
    return await this.eventTypeRepository.create(eventTypeData);
  }

  /**
   * Get event type by ID
   */
  async getEventTypeById(eventTypeId: string): Promise<EventTypeDto> {
    const eventType = await this.eventTypeRepository.findById(eventTypeId);
    if (!eventType) {
      throw new ResourceNotFoundException('EventType', eventTypeId);
    }
    return eventType;
  }

  /**
   * Get all event types
   */
  async getAllEventTypes(): Promise<EventTypeDto[]> {
    return await this.eventTypeRepository.findAll();
  }

  /**
   * Update event type
   */
  async updateEventType(eventTypeId: string, updateData: UpdateEventTypeDto): Promise<boolean> {
    const updated = await this.eventTypeRepository.update(eventTypeId, updateData);
    if (!updated) {
      throw new ResourceNotFoundException('EventType', eventTypeId);
    }
    return true;
  }

  /**
   * Delete event type
   */
  async deleteEventType(eventTypeId: string): Promise<boolean> {
    const deleted = await this.eventTypeRepository.delete(eventTypeId);
    if (!deleted) {
      throw new ResourceNotFoundException('EventType', eventTypeId);
    }
    return true;
  }

  /**
   * Find event type by name
   */
  async getEventTypeByName(name: string): Promise<EventTypeDto> {
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
  }

  /**
   * Count all event types
   */
  async countEventTypes(): Promise<number> {
    return await this.eventTypeRepository.count();
  }
}
