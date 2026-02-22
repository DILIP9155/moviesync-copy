/**
 * Notifications: SMS via Twilio (when env set), FCM placeholder.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE in .env to enable SMS.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;
const hasTwilio = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE;

const PICKUP_MESSAGE = 'Your Moveinsync cab has arrived for pickup. Please proceed to the boarding point.';

async function sendSms(to, body) {
  if (!hasTwilio) return { sent: false, reason: 'Twilio not configured' };
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', TWILIO_PHONE);
  form.set('Body', body);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Twilio error');
    return { sent: true, sid: data.sid };
  } catch (err) {
    console.error('[Notification] Twilio SMS error:', err.message);
    return { sent: false, error: err.message };
  }
}

async function sendPickupArrivalNotification(tripId, vehicleId, stopIndex, employeePhone) {
  console.log(`[Notification] Pickup arrived - tripId: ${tripId}, vehicleId: ${vehicleId}, stopIndex: ${stopIndex}`);
  if (employeePhone) {
    const result = await sendSms(employeePhone, PICKUP_MESSAGE);
    return result;
  }
  return { sent: false, reason: 'No phone for employee' };
}

async function logManualOverrideAlert(tripId, vehicleId, reason) {
  console.warn(`[Manual Override] tripId: ${tripId}, vehicleId: ${vehicleId}, reason: ${reason}`);
  return { logged: true };
}

module.exports = {
  sendPickupArrivalNotification,
  logManualOverrideAlert,
  sendSms
};
