/** Validate results and tasks against the committed JSON Schemas. */
import Ajv2020 from 'ajv/dist/2020.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const resultSchema = JSON.parse(readFileSync('schemas/bench-result.schema.json', 'utf8'))
const packSchema = JSON.parse(readFileSync('schemas/bench-pack.schema.json', 'utf8'))
const tasksFile = JSON.parse(readFileSync('data/tasks.json', 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false })
const validateResult = ajv.compile(resultSchema)
ajv.addSchema(packSchema, 'bench-pack.schema.json')
const validateTask = ajv.compile({ $ref: 'bench-pack.schema.json#/$defs/task' })

let failures = 0
for (const name of readdirSync('data/results').filter(file => file.endsWith('.json'))) {
  const result = JSON.parse(readFileSync(join('data/results', name), 'utf8'))
  if (!validateResult(result)) {
    failures += 1
    console.error(`${name}: ${ajv.errorsText(validateResult.errors)}`)
  }
}
for (const task of tasksFile.tasks ?? []) {
  if (!validateTask(task)) {
    failures += 1
    console.error(`${task.id}: ${ajv.errorsText(validateTask.errors)}`)
  }
}
if (failures > 0) process.exit(1)
console.log(`schemas ok · ${readdirSync('data/results').filter(f => f.endsWith('.json')).length} results · ${tasksFile.tasks.length} tasks`)
