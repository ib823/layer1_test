import type { Connector } from './base';
import { S4Connector } from './s4hana';
import { SuccessFactorsConnector } from './successfactors';
import { AribaConnector } from './ariba';

export function getConnector(name: string): Connector | null {
  switch ((name || '').toLowerCase()) {
    case 's4':
    case 's4hana':
      return new S4Connector({});
    case 'sf':
    case 'successfactors':
      return new SuccessFactorsConnector({});
    case 'ariba':
      return new AribaConnector({});
    default:
      return null;
  }
}
