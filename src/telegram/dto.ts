export class SendMessageDto {
  name: string;
  text: string;
  role: 'user' | 'admin';
  userId: string;
  chat: string;
}
