import { AppRequest } from '../models';

/**
 * @param {AppRequest} request
 * @returns {string}
 */
export function getUserIdFromRequest(request: AppRequest): string {
  if (request.user && request.user.id) {
    return request.user.id;
  }

  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme === 'Basic' && token) {
    const [username] = Buffer.from(token, 'base64').toString('utf8').split(':');

    if (username) {
      return username;
    }
  }

  return 'anonymous';
}
