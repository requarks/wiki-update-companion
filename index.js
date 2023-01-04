const Docker = require('dockerode')

const defaultMathesarServiceContainerName = 'mathesar_service'
const defaultMajorVersion = '1'
const ghcrUrl = 'ghcr.io/centerofci/mathesar'

function isMathesarServiceContainer (name, container) {
  hasCorrectName = container.Names.some(n => n === `/${name}` || n === name)
  hasCorrectImage = (
    container.Image.startsWith(ghcrUrl)
    || container.Image.startsWith('centerofci/mathesar')
  )
  return hasCorrectName && hasCorrectImage
}

async function getMathesarServiceContainer (name) () {
  console.info(`Finding ${name} container...`)
  const containers = await dk.listContainers({ all: true })
  const containerDesc = containers.find(c => isMathesarServiceContainer(name, c))
  if (!containerDesc) {
    throw new Error(`Could not find ${name} container.`)
  }
  console.info(`Found ${name} container (ID ${containerDesc.Id})`)
  const container = dk.getContainer(containerDesc.Id)
  return await container.inspect()
}

async function upgrade (name, version) {
  console.info('Connecting to Docker API...')
  const dk = new Docker({ socketPath: '/var/run/docker.sock' })

  const prevContainer = await getMathesarServiceContainer(name)

  if (prevContainer.State.Status !== 'exited') {
    console.info('Attempting to stop container...')
    await prevContainer.stop()
  }
  console.info('Container is stopped.')

  console.info('Removing container...')
  await prevContainer.remove({ v: true })
  console.info('Container has been removed.')

  console.info('Pulling latest Mathesar image...')
  await new Promise((resolve, reject) => {
    dk.pull(`${ghcrUrl}:${version}`, (err, stream) => {
      if (err) { return reject(err) }
      dk.modem.followProgress(stream, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })

  console.info('Recreating container...')
  const newContainer = await dk.createContainer({
    name: name,
    Image: `${ghcrUrl}:${version}`,
    Env: prevContainerInfo.Config.Env,
    ExposedPorts: prevContainerInfo.Config.ExposedPorts,
    Hostname: name,
    HostConfig: prevContainerInfo.HostConfig
  })
  console.info('Starting container...')
  await newContainer.start()
  console.info(`Container ${newContainer.id} started successfully.`)
}

async function main () {
  const fastify = require('fastify')({ logger: true })

  fastify.get('/', async (request, reply) => {
    return { ok: true }
  })

  fastify.post('/upgrade/:version?', async (request, reply) => {
    try {
      upgrade(
        request.query.container || defaultMathesarServiceContainerName,
        request.params.version || defaultMajorVersion
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
