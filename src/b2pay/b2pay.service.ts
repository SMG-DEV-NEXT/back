import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class B2PayService {
    private readonly logger = new Logger(B2PayService.name);

    private readonly BASE_URL = 'https://app.b2pay.online/v1';

    private jwtToken: string | null = null;
    private tokenExpiresAt: number | null = null;

    constructor(private readonly httpService: HttpService) { }

    /* ===============================
       AUTH TOKEN
    =============================== */
    private async getJwtToken(): Promise<string> {
        // Reuse token if still valid
        if (this.jwtToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
            return this.jwtToken;
        }

        const response = await firstValueFrom(
            this.httpService.post(`${this.BASE_URL}/auth/token/get`, {
                user_id: process.env.B2PAY_USER_ID,
                email: process.env.B2PAY_EMAIL,
                api_key: process.env.B2PAY_API_KEY,
                token_expiry_hours: 24,
            }),
        );

        this.jwtToken = response.data.token;

        // token expiry buffer (23h)
        this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;

        return this.jwtToken;
    }

    /* ===============================
       CREATE INVOICE
    =============================== */
    async createInvoice(data: {
        customerId: string;
        amount: number;
        currency: string;
        description: string;
        returnUrl: string;
        notificationUrl: string;
    }) {
        const token = await this.getJwtToken();

        const response = await firstValueFrom(
            this.httpService.post(
                `${this.BASE_URL}/invoices`,
                {
                    customer_id: data.customerId,
                    amount: data.amount,
                    currency: data.currency,
                    description: data.description,
                    return_url: data.returnUrl,
                    notification_url: data.notificationUrl,
                    test_mode: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                },
            ),
        );

        return response.data;
    }
}
