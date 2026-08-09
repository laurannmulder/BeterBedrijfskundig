import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

// Scopes needed to read case documents from the firm's SharePoint/OneDrive
// on behalf of the signed-in bedrijfskundige (delegated permissions).
const GRAPH_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'Files.Read.All', 'Sites.Read.All']

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: { params: { scope: GRAPH_SCOPES.join(' ') } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
})
