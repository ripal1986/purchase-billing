import { google } from 'googleapis';

const FALLBACK_CLIENT_EMAIL = "calculator-bot@purchase-calulater.iam.gserviceaccount.com";
const FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDKAwMM4Rb9EGy6
Sbs/YSuPK/frrh6ffcoYnf7kwbMytLvMD6SyvGEBA/T2aX5PFI9l1wGYLpDQVPUm
NYyiyPmYHrphCh6CoxNMaKH+kgKSnSlSNCjLFnbL3YMV9lWgy7wuQAWOhUErGB96
ScGc5OIT1pGUAhjoEFmDxAa1COvr/9+eXCyRRjTArc2SrO7tgTqsBkr2AmQgOJTr
ZhBvpeGQkn0Oq+OVTqhbkfVbL0gUju2WrZL37ZtZNDED7ZCOh886qg1zzcOuqkf8
gC5M/0SUCRSRDaGc6Nl3vtDM1kZR1FvOfeUrN/O7xb7l8bLSqCKKg1ttWsa5QOIT
hmcDjxwJAgMBAAECggEAHQwM0rvE8fN8Jtc2QPlIaahRWEarqZRNTHffcGY3zak2
PbPcI0U6D4rRnOLzYgybR/IADTFY6lPlAi79/2Q1m32DoDNzyqYHPtvmuzOkgg9u
Ix9T5EvhHhRGZpCKpHnXH7Fd+y3G/prT3+IeIGC6705RlX4ttaSwMmWr7zkOr1rU
NUgG1FZBgnkcoHmfHiPzTFU6iWQ5Emeh/YznUXEYnPwfRtmG5JQm4DuBoblH0a7F
QiFyw6nfjEpFsG4RpSLc0TdLu5P7QIUGeI4GBu0f+A7DX5rEih0qdBSCNh7VQOO8
W4UXp2aHmaLzYX1l0yxD4AjN1gjK7kxTrcdP8bKVPwKBgQD9WioW2rcR6t0P5wmK
koq7GJLNIfzCz7dGccOkVUZ2/bor9c2p2tz9S5xVNGdYxi5pinCqXcma2SLDKg8e
59xwI7JzTQCaa0AaUrEMuvXNgR+BV4Ue6Y2XHC+B/1FK5U+4UlxoDYQ+GM6XZ7+o
WAt5Khaa+tc2/d+1AZI0hAALIwKBgQDMH3ziPK0M1ogw6CTgeGHHb6+rBAtuXGX3
eHuXhMjmoCLr4/eletjOPuDqRJyeAzS2R9kvQhdrFQZcBkrHyg2XgvoFdhD8bPUz
h242uHyLL3ilunytAGFlnNPTkuFSvk1SWKc5DS4UTldxsuddxLSDHl2RxEfMAti/
lnhzEmeU4wKBgQDoNNKs3cu7JVt17tjk5Ek5EF3Em+kSGNWvQCgDn5EVEJqpHgJh
MtMnaTyhL4WlbQcu/o8i5xEX1vowjIUNW4/ETEOLwEDUR4aaWb4in90YfMeGgdPm
MEPxAwlcCcnVbnVxyDMfv3u8enondRTJ0+C4LeZIJ65HncqDGSyK640qpwKBgQCY
DYCmupIh9REgdV07BRG5UZ4nI20seZHPZaWTOeu5uGIrG/cXAsrL4BUFDbUpE7RJ
cH39cRsmvlOta1Z7Oy0ixwNd3BRNJREGoITeKFFGEUerFJ7Y9GaZHdjBSzGjxHSu
ubFfk0zW/YCwBpfIxsW8wnrrIa5l71zsYrc46OXWBwKBgQCa7dZYkNUs/VBFSf0x
rCFOTaApBvirIQOSymTpbzMQ9Kf/bqRfmNym1Hb+89jpwaNI/I8kUV43qPQM6s6Q
m9EYbcj/0+mNTXImZhBSj8K8FP5oymg9XHuRcnSP2AE8/4lGOS80MuFoUZVega1U
85v51+Dyn2WWoy+v1NfbjlIAGw==
-----END PRIVATE KEY-----`;

export function getGoogleSheetsClient(readonly = false) {
  let client_email = process.env.GOOGLE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL;
  let private_key = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : FALLBACK_PRIVATE_KEY;

  const scopes = readonly
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key
    },
    scopes,
  });

  return google.sheets({ version: 'v4', auth });
}
