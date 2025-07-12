// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TelegramService } from './telegram.service';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*', // or your frontend URL
  },
}) // Allow CORS for frontend
export class TelegramGateway {
  @WebSocketServer() server: Server;

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  private userSocketMap = new Map<string, string>();

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    // Remove user by socket.id
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    client,
    data: {
      name: string;
      text: string;
      role: 'user' | 'admin';
      userId: string;
      chat: string;
    },
  ) {
    const { name, text, role, userId, chat } = data;

    // 1. Send to Telegram
    await this.telegram.sendMessage(name, text, role, userId, chat);

    // 2. Save in DB
    const saved = await this.prisma.message.create({
      data: {
        name,
        text,
        userId: userId,
        role,
      },
    });

    // 3. Emit to all clients
  }
  async sendMessageToAllClients(message: any) {
    this.server.emit('new-message', message);
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.userSocketMap.set(userId, client.id);
  }

  sendMessageToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    } else {
      console.warn(`User ${userId} not connected`);
    }
  }
}
