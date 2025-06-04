import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { pool  } from "../../lib/db.js"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Añadir configuración de timeout
      httpOptions: {
        timeout: 10000, // 10 segundos
      }
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        try {
          const [rows] = await pool.execute(
            "SELECT * FROM Usuario WHERE Email = ? LIMIT 1",
            [user.email]
          )

          console.log("Email recibido de Google:", user.email)
          console.log("Resultado de la query:", rows)

          if (rows.length === 0) {
            console.log("Acceso denegado para:", user.email)
            return false
          }

          // Guardar el idUsuario para usarlo en el token y la sesión
          user.id = rows[0].idUsuario
          
          console.log("Acceso permitido para:", user.email)
          return true
        } catch (err) {
          console.error("Error consultando la base de datos:", err)
          return false
        }
      }

      return true
    },

    async session({ session, token }) {
      // Pasar el id del usuario a la sesión
      session.user.id = token.id
      return session
    },

    async jwt({ token, user, account }) {
      // Guardar el id del usuario en el token
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }