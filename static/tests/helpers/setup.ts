/* eslint no-console: off */

import { spawn } from 'child_process'
import mqtt, { MqttClient } from 'mqtt'
import { getFreePort } from './tools'
import fetchMock from 'fetch-mock'
import index from '../../dist/index'

export const setupVars : {
    mosquitto: any,
    mosquittoPort: string,
    mqttClient: MqttClient
} = {
    mosquitto: null,
    mosquittoPort: null,
    mqttClient: null
}

export function bootstrap() {
    beforeAll(async () => {
        const mosquittoPort = await getFreePort()
        console.log('Launching mosquitto on port [' + mosquittoPort + ']')
        // To print full mosquitto logs, replace stdio: 'ignore' with stdio: 'inherit'
        const mosquitto = spawn('mosquitto', ['-p', mosquittoPort, '-v'], { stdio: 'ignore' })
        console.log('Mosquitto ready!')
        setupVars.mosquitto = mosquitto
        setupVars.mosquittoPort = mosquittoPort
        index({
            hermesOptions: {
                address: 'localhost:' + mosquittoPort,
                logs: true
            },
            bootstrapOptions: {
                i18n: {
                    mock: true
                },
                http: {
                    mock: require('../httpMocks').mock(fetchMock.sandbox())
                }
            }
        })
    })

    beforeEach(done => {
        const client = mqtt.connect(`mqtt://localhost:${setupVars.mosquittoPort}`)
        client.on('connect', function () {
            done()
        })
        client.on('error', function(err) {
            client.end(true)
            throw err
        })
        setupVars.mqttClient = client
    })

    afterEach(() => {
        setupVars.mqttClient.end(true)
    })

    afterAll(done => {
        const { mosquitto } = setupVars
        setTimeout(() => {
            mosquitto.kill()
            console.log('Mosquitto killed.')
            done()
        }, 500)
    })
}
