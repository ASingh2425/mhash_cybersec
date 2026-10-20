import { Response } from 'express';

export interface RealtimeMessage {
  type:
    | 'identity_created'
    | 'auth_evaluated'
    | 'service_accessed'
    | 'risk_updated'
    | 'anomaly_detected'
    | 'containment_executed'
    | 'graph_updated'
    | 'baseline_reset';
  timestamp: string;
  data: any;
}

class EventBus {
  private clients: Set<Response> = new Set();

  addClient(res: Response) {
    this.clients.add(res);
  }

  removeClient(res: Response) {
    this.clients.delete(res);
  }

  broadcast(type: RealtimeMessage['type'], data: any) {
    const payload: RealtimeMessage = {
      type,
      timestamp: new Date().toISOString(),
      data
    };
    const message = `data: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }
}

export const eventBus = new EventBus();
