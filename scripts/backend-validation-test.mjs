import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = resolve(root, 'backend/spacetimedb/src/validation.rs')
const output = resolve(process.env.TEMP ?? process.cwd(), `moo-tanks-validation-${randomUUID()}.exe`)

try {
  const compile = spawnSync('rustc', ['--edition', '2024', '--test', source, '-o', output], {
    cwd: root,
    stdio: 'inherit',
  })
  if (compile.status !== 0) process.exit(compile.status ?? 1)

  const run = spawnSync(output, [], { cwd: root, stdio: 'inherit' })
  process.exit(run.status ?? 1)
} finally {
  rmSync(output, { force: true })
}
