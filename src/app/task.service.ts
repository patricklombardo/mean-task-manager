import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(private webReqService: WebRequestService) {}

  getLists() {
    return this.webReqService.get('lists');
  }

  getTasks(listId: string) {
    return this.webReqService.get(`lists/${listId}/tasks`);
  }

  createList(title: string) {
    // Send an ajax request to create a list
    return this.webReqService.post('lists', { title });
  }

  createTask(title: string, listId: string) {
    // Send an ajax request to create a task
    return this.webReqService.post(`lists/${listId}/tasks`, { title });
  }
}
