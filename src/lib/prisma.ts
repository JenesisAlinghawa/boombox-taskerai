import { PrismaClient } from '@prisma/client'
import { setupAuditMiddleware } from './auditMiddleware.js'

const prismaClientSingleton = () => {
  const client = new PrismaClient()
  
  // Audit middleware disabled - causing 500 errors on task operations
  // setupAuditMiddleware(client)
  
  return client
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = global.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
