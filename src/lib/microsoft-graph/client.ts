import { Client } from '@microsoft/microsoft-graph-client'

// Delegated Graph client: calls SharePoint/OneDrive as the signed-in bedrijfskundige,
// scoped to whatever that user already has access to.
export function createGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  })
}
