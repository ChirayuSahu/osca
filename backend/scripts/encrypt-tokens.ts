import { prisma } from '../src/utils/prisma'
import { encryptToken } from '../src/lib/crypto/token-cipher'

// One-off: encrypt GitHub tokens stored before encryption at rest existed.
// Safe to re-run; already-encrypted values are skipped.
const main = async () => {
  const accounts = await prisma.oAuthAccount.findMany({
    where: { NOT: { accessToken: { startsWith: 'enc:v1:' } } },
    select: { id: true, accessToken: true }
  })
  let updated = 0
  for (const account of accounts) {
    if (!account.accessToken) continue
    await prisma.oAuthAccount.update({ where: { id: account.id }, data: { accessToken: encryptToken(account.accessToken) } })
    updated++
  }
  console.log(`[encrypt-tokens] encrypted ${updated} of ${accounts.length} plaintext tokens`)
}

main()
  .catch(error => {
    console.error('[encrypt-tokens] failed', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
