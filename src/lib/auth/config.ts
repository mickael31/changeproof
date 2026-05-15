import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import * as bcrypt from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"

const SSO_AUTO_CREATE_ORG = process.env.SSO_AUTO_CREATE_ORG === "true"

function extractEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? ""
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Credentials provider : déjà géré par authorize()
      if (account?.provider === "credentials") return true

      // OAuth/SSO : vérifier ou créer l'utilisateur avec son organizationId
      if (!user.email) return false

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true },
      })

      if (existingUser) {
        // L'utilisateur existe déjà → on autorise
        // Mettre à jour son image si fournie par le provider
        if (user.image && !existingUser.image) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { image: user.image },
          })
        }
        return true
      }

      // Nouvel utilisateur : chercher une organisation correspondant à son domaine email
      const domain = extractEmailDomain(user.email)
      let organization = await prisma.organization.findFirst({
        where: { ssoDomain: domain },
      })

      if (!organization) {
        if (SSO_AUTO_CREATE_ORG) {
          // Créer une organisation par défaut pour ce domaine
          const slug = domain.replace(/[^a-z0-9-]/g, "-")
          organization = await prisma.organization.create({
            data: {
              name: domain,
              slug: slug,
              ssoDomain: domain,
              plan: "free",
            },
          })
        } else {
          // Bloquer la connexion si aucune organisation ne correspond
          console.warn(
            `[SSO] Connexion refusée pour ${user.email} : aucune organisation trouvée pour le domaine ${domain}. ` +
            `Ajoutez le domaine dans Organization.ssoDomain ou activez SSO_AUTO_CREATE_ORG=true`
          )
          return false
        }
      }

      // Mettre à jour l'utilisateur créé par l'adapter Prisma avec l'organizationId
      // Note : l'adapter crée l'utilisateur avant le callback signIn,
      // donc on récupère l'utilisateur fraîchement créé via l'Account
      try {
        const createdUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (createdUser && !createdUser.organizationId) {
          await prisma.user.update({
            where: { id: createdUser.id },
            data: {
              organizationId: organization.id,
              image: user.image ?? createdUser.image,
            },
          })
        }
      } catch (err) {
        console.error("[SSO] Erreur lors de l'association de l'organisation :", err)
        return false
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role as string
        token.orgId = (user as any).organizationId as string
      }
      // Si l'utilisateur existe déjà mais que le token n'a pas encore l'orgId
      // (cas d'une connexion OAuth où l'utilisateur existait déjà)
      if (token.id && !token.orgId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organizationId: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.orgId = dbUser.organizationId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).orgId = token.orgId as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register")

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl))
      }

      return true
    },
  },
  providers: [
    // --- OAuth / SSO ---
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(process.env.AUTH_AZURE_AD_ID && process.env.AUTH_AZURE_AD_SECRET
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_AZURE_AD_ID,
            clientSecret: process.env.AUTH_AZURE_AD_SECRET,
            issuer: process.env.AUTH_AZURE_AD_TENANT_ID
              ? `https://login.microsoftonline.com/${process.env.AUTH_AZURE_AD_TENANT_ID}/v2.0/`
              : undefined,
          }),
        ]
      : []),
    // --- Credentials ---
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
}
