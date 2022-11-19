const Docker = require('dockerode')

async function upgrade (name, version) {
  console.info('Connecting to Docker API...')
  const dk = new Docker({ socketPath: '/var/run/docker.sock' })

  console.info(`Finding ${name} container...`)
  const containers = await dk.listContainers({ all: true })
  const wiki = containers.find(c => {
    return c.Names.some(n => n === `/${name}` || n === name) && (c.Image.startsWith('ghcr.io/requarks/wiki') || c.Image.startsWith('requarks/wiki'))
  })
  if (!wiki) {
    throw new Error(`Could not find ${name} container.`)
  }
  console.info(`Found ${name} container (ID ${wiki.Id})`)
  const wk = dk.getContainer(wiki.Id)

  const wkConfig = await wk.inspect()

  if (wiki.State !== 'exited') {
    console.info('Attempting to stop container...')
    await wk.stop()
  }
  console.info('Container is stopped.')

  console.info('Removing container...')
  await wk.remove({ v: true })
  console.info('Container has been removed.')

  console.info('Pulling latest Wiki.js image...')
  await new Promise((resolve, reject) => {
    dk.pull(`ghcr.io/requarks/wiki:${version}`, (err, stream) => {
      if (err) { return reject(err) }
      docker.modem.followProgress(stream, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })

  console.info('Recreating container...')
  const wkn = await dk.createContainer({
    name: name,
    Image: `ghcr.io/requarks/wiki:${version}`,
    Env: wkConfig.Config.Env,
    ExposedPorts: wkConfig.Config.ExposedPorts,
    Hostname: name,
    HostConfig: wkConfig.HostConfig
  })
  console.info('Starting container...')
  await wkn.start()
  console.info(`Container ${wkn.id} started successfully.`)
}

async function main () {
  const fastify = require('fastify')({ logger: true })

  fastify.get('/', async (request, reply) => {
    return { ok: true }
  })

  fastify.post('/upgrade/:version?', async (request, reply) => {
    try {
      upgrade(
        request.query.container || 'wiki',
        request.params.version || '2'
        )
      return { started: true }
    } catch (err) {
      console.error(err)
      return { started: false, error: err.message}
    }
  })
  
  try {
    await fastify.listen({
      port: 80,
      host: '0.0.0.0'
    })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
main()