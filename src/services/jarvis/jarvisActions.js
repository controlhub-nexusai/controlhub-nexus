import { routeCommand } from '../commandRouter'

export function resolveJarvisAction(message, context) {
  return routeCommand(message, context)
}
