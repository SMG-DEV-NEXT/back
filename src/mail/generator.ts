import { Transaction } from '@prisma/client';
import * as moment from 'moment';

export const generateForgetPasswordMail = (code: string, lang: string) => {
  return `
    <!DOCTYPE html>
<html lang=${lang === 'en' ? 'en' : 'ru'}>
  <head>
    <meta charset="UTF-8" />
    <title>${lang === 'en' ? 'Password Reset Code - SMG' : 'Код для сброса пароля - SMG'}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#181A1F; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #1F2127; border-radius: 10px; padding: 30px;">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <h2 style="color:#8B6DCA; font-size: 24px; margin: 0;">SMG — ${lang === 'en' ? 'Password Reset' : 'Сброс пароля'}</h2>
              </td>
            </tr>
            <tr>
              <td style="color: #E9E3F6; font-size: 16px; line-height: 1.6; text-align: left;">
                <p>${lang === 'en' ? 'Hello,' : 'Здравствуйте,'}</p>
                <p>${lang === 'en' ? 'You requested a password reset. Please enter the following code on the website to continue:' : 'Вы запросили сброс пароля. Введите следующий код на сайте, чтобы продолжить:'}</p>
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
                <p>${lang === 'en' ? 'If you did not request a password reset, please ignore this email.' : 'Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.'}</p>
                <p>${lang === 'en' ? 'The code is valid for 10 minutes.' : 'Код действителен в течение 10 минут.'}</p>
                <p>${lang === 'en' ? 'Best regards,' : 'С уважением,'}<br />SMG Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; text-align: center; color: #555; font-size: 12px;">
                © 2025 SMG. ${lang === 'en' ? 'All rights reserved.' : 'Все права защищены.'}
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
  return percent.toFixed();
}

export const generatorAfterCheckoutMail = (transaction: Transaction) => {
  const lang = transaction.userLanguage || 'ru';
  return `
       <!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>${lang === 'en' ? 'Thank you for your purchase' : 'Спасибо за покупку'}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family: Arial, sans-serif; color:#E9E3F6;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="margin: auto; padding: 30px; background-color:#181A1F;">
      <tr>
        <td>
          <h1 style="color:#E9E3F6; font-size:26px; margin-bottom:10px;">${lang === 'en' ? 'Thank you for your purchase!' : 'Спасибо за покупку!'}</h1>
          <p style="color:#A9A4B9; font-size:16px; margin-top:0;">${lang === 'en' ? 'Your order has been successfully placed.' : 'Ваш заказ успешно оформлен.'}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F2127; border:1px solid #3B3E45; padding:20px; margin-top:25px;">
            <tr>
              <td>
                <h2 style="font-size:18px; margin-bottom:12px; color:#E9E3F6;">${lang === 'en' ? 'Your purchased cheats and codes:' : 'Ваши приобретённые читы и коды:'}</h2>

                <!-- Коды -->
                ${transaction.codes
                  .map(
                    (e, i) => `
                <table width="100%" cellpadding="10" cellspacing="0" style="background-color:#181A1F; border:1px solid #3B3E45; margin-bottom:6px;">
                  <tr>
                    <td style="font-size:16px; color:#E9E3F6;">
                      ${lang === 'en' ? 'Cheat code' : 'Чит-код'} №${i + 1}: <strong style="color:#8B6DCA;">${e}</strong>
                    </td>
                  </tr>
                </table>
                `,
                  )
                  .join('')}

                <table width="100%" cellpadding="5" cellspacing="0" style="margin-top:20px; font-size:15px; color:#E9E3F6;">
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold; width:150px;">${lang === 'en' ? 'Order number' : 'Номер заказа'}:</td>
                    <td>${transaction.orderId}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">${lang === 'en' ? 'Purchase date' : 'Дата покупки'}:</td>
                    <td>${moment(transaction.createdAt).format('HH:mm D MMMM, YYYY')}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">${lang === 'en' ? 'Customer email' : 'Email покупателя'}:</td>
                    <td>${transaction.email}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">${lang === 'en' ? 'Discount' : 'Скидка'}:</td>
                    <td>${calculatePercentageDifference(transaction.price, transaction.checkoutedPrice)}%</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">${lang === 'en' ? 'Base price' : 'Базовая цена'}:</td>
                    <td>${transaction.currency === 'USD' ? `$${Number(transaction.price).toFixed(2)}` : `${transaction.price} ₽`}</td>
                  </tr>
                  <tr>
                    <td style="color:#8B6DCA; font-weight:bold;">${lang === 'en' ? 'Price after discount' : 'Цена после скидки'}:</td>
                    <td>${transaction.currency === 'USD' ? `$${Number(transaction.checkoutedPrice).toFixed(2)}` : `${transaction.checkoutedPrice} ₽`}</td>
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

export const generateForRegistrationRu = (url: string) => {
  return `
    <!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Подтверждения регистрации</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#181A1F; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #1F2127; border-radius: 10px; padding: 30px;">
            <tr>
              <td style="color: #E9E3F6; font-size: 16px; line-height: 1.6; text-align: left;">
                <p>Здравствуйте,</p>
                <p>Спасибо за регистрацию на <a href="https://smgcheats.com" style="color: #8B6DCA; text-decoration: underline;">SMGCHEATS.COM!</a></p>
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
                 Для подтверждения регистрации нажмите на данную <a href="${url}" style="color: #181A1F; text-decoration: underline;">ссылку</a>.
                </div>
              </td>
            </tr>
            <tr>
              <td style="color: #A09CB5; font-size: 14px; line-height: 1.5; text-align: left;">
                <p>Если вы не запрашивали подтверждение регистрации — просто проигнорируйте это письмо.</p>
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

export const generateForRegistrationEn = (url: string) => {
  return `
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Registration Confirmation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#181A1F; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#181A1F; padding: 20px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #1F2127; border-radius: 10px; padding: 30px;">
            <tr>
              <td style="color: #E9E3F6; font-size: 16px; line-height: 1.6; text-align: left;">
                <p>Hello,</p>
                <p>Thank you for registering at <a href="https://smgcheats.com" style="color: #8B6DCA; text-decoration: underline;">SMGCHEATS.COM!</a></p>
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
                  To confirm your registration, please click on this <a href="${url}" style="color: #181A1F; text-decoration: underline;">link</a>.
                </div>
              </td>
            </tr>
            <tr>
              <td style="color: #A09CB5; font-size: 14px; line-height: 1.5; text-align: left;">
                <p>If you did not request a registration confirmation, please ignore this email.</p>
                <p>Best regards,<br />The SMG Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 30px; text-align: center; color: #555; font-size: 12px;">
                © 2025 SMG. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
