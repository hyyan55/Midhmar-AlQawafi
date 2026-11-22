import tls from 'node:tls';
import { env } from '../config/env.ts';

function readReply(socket: tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timeout = setTimeout(() => finish(new Error('SMTP response timeout')), 15000);
    const onData = (chunk: Buffer | string) => {
      data += chunk.toString();
      if (/\r\n\d{3} [^\r\n]*\r\n$/.test(data)) finish();
    };
    const onError = (error: Error) => finish(error);
    function finish(error?: Error) {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
      if (error) reject(error);
      else resolve(data);
    }
    socket.on('data', onData);
    socket.on('error', onError);
  });
}
function assertReply(reply: string, expected: number) {
  if (!reply.split(/\r?\n/).some((line) => line.startsWith(String(expected)))) {
    throw new Error('SMTP command rejected: ' + reply.trim().slice(-200));
  }
}
function encodeHeader(value: string) {
  return '=?UTF-8?B?' + Buffer.from(value, 'utf8').toString('base64') + '?=';
}
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.smtpUser || !env.smtpPass || !env.emailFrom) throw new Error('SMTP is not configured');
  const socket = tls.connect({ host: env.smtpHost, port: env.smtpPort, servername: env.smtpHost });
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
      socket.setTimeout(20000, () => reject(new Error('SMTP connection timeout')));
    });
    assertReply(await readReply(socket), 220);
    const command = async (line: string, code: number) => {
      socket.write(line + '\r\n');
      assertReply(await readReply(socket), code);
    };
    await command('EHLO midhmar-alqawafi', 250);
    await command('AUTH LOGIN', 334);
    await command(Buffer.from(env.smtpUser).toString('base64'), 334);
    await command(Buffer.from(env.smtpPass.replace(/\s/g, '')).toString('base64'), 235);
    const from = env.emailFrom.match(/<([^>]+)>/)?.[1] || env.smtpUser;
    await command('MAIL FROM:<' + from + '>', 250);
    await command('RCPT TO:<' + to + '>', 250);
    await command('DATA', 354);
    const message = [
      'From: ' + encodeHeader('مِضمار القوافي') + ' <' + from + '>',
      'To: <' + to + '>',
      'Subject: ' + encodeHeader(subject),
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n'),
      '.',
      '',
    ].join('\r\n');
    socket.write(message);
    assertReply(await readReply(socket), 250);
    await command('QUIT', 221);
  } finally {
    socket.end();
  }
}
