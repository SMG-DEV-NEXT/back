import { Transaction } from '@prisma/client';
import * as moment from 'moment';

export const generateForgetPasswordMail = (code: string) => {
  return `
    <!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Код для сброса пароля - SMG</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#181A1F; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #1F2127; border-radius: 10px; padding: 30px;">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <h2 style="color:#8B6DCA; font-size: 24px; margin: 0;">SMG — Сброс пароля</h2>
              </td>
            </tr>
            <tr>
              <td style="color: #E9E3F6; font-size: 16px; line-height: 1.6; text-align: left;">
                <p>Здравствуйте,</p>
                <p>Вы запросили сброс пароля. Введите следующий код на сайте, чтобы продолжить:</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0;">
                <div style="
                  display: inline-block;
                  background-color: #8B6DCA;
                  color: #181A1F;
                  padding: 12px 24px;
                  font-size: 22px;
                  font-weight: bold;
                  letter-spacing: 2px;
                  border-radius: 8px;
                ">
                 ${code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="color: #A09CB5; font-size: 14px; line-height: 1.5; text-align: left;">
                <p>Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>
                <p>Код действителен в течение 10 минут.</p>
                <p>С уважением,<br />Команда SMG</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; text-align: center; color: #555; font-size: 12px;">
                © 2025 SMG. Все права защищены.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
function calculatePercentageDifference(original, newNumber) {
  const difference = original - newNumber;
  const percent = (difference / original) * 100;
  return percent;
}

export const generatorAfterCheckoutMail = (transaction: Transaction) => {
  return `
       <!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Спасибо за покупку</title>
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family: Arial, sans-serif; color:#E9E3F6;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="margin: auto; padding: 30px; background-color:#181A1F;">
      <tr>
        <td>
          <h1 style="color:#E9E3F6; font-size:26px; margin-bottom:10px;">Спасибо за покупку!</h1>
          <p style="color:#A9A4B9; font-size:16px; margin-top:0;">Ваш заказ успешно оформлен.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F2127; border:1px solid #3B3E45; padding:20px; margin-top:25px;">
            <tr>
              <td>
                <h2 style="font-size:18px; margin-bottom:12px; color:#E9E3F6;">Ваши приобретённые читы и коды:</h2>

                <!-- Коды -->
                ${transaction.codes
                  .map(
                    (e, i) => `
                <table width="100%" cellpadding="10" cellspacing="0" style="background-color:#181A1F; border:1px solid #3B3E45; margin-bottom:6px;">
                  <tr>
                    <td style="font-size:16px; color:#E9E3F6;">
                      Чит-код №${i + 1}: <strong style="color:#8B6DCA;">${e}</strong>
                    </td>
                  </tr>
                </table>
                `,
                  )
                  .join('')}

                <table width="100%" cellpadding="5" cellspacing="0" style="margin-top:20px; font-size:15px; color:#E9E3F6;">
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold; width:150px;">Номер заказа:</td>
                    <td>${transaction.id}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">Дата покупки:</td>
                    <td>${moment(transaction.createdAt).format('D MMMM, YYYY')}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">Email покупателя:</td>
                    <td>${transaction.email}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">Скидка:</td>
                    <td>${calculatePercentageDifference(transaction.price, transaction.checkoutedPrice)}%</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">Базовая цена:</td>
                    <td>${transaction.price}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">Цена после скидки:</td>
                    <td>${transaction.checkoutedPrice}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

`;
};
