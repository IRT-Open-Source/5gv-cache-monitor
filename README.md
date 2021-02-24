| [![5G-VICTORI logo](doc/images/5g-victori-logo.png)](https://www.5g-victori-project.eu/) | This project has received funding from the European Union’s Horizon 2020 research and innovation programme under grant agreement No 857201. The European Commission assumes no responsibility for any content of this repository. | [![Acknowledgement: This project has received funding from the European Union’s Horizon 2020 research and innovation programme under grant agreement No 857201.](doc/images/eu-flag.jpg)](https://ec.europa.eu/programmes/horizon2020/en) |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |


# Cache Monitor

Monitors availability of media items in [Cache](../../../5gv-cache)

## What is this?

The Cache Monitor service is part of the [platform](../../../5gv-platform) for media caching on trains. It is responsible for observing the cache directory of the [Cache](../../../5gv-cache) to determine availability of content. Changes in the availability of content items are reported to the [State API](../../../5gv-state-api) which adapts the cache state in the State DB accordingly. The cache state is queried by the [Prefetcher](../../../5gv-prefetcher) which will request missing content items from the cache in order for it to load the content from the upstream location.

## How does it work?

Below architecture diagram shows the software modules that implement the essential functionalities of the Cache Monitor. These include clients for HTTP communication with the [State API](../../../5gv-state-api) and communication with the [Message Streamer](../../../5gv-messenger). A core logic module manages the file system observer and coordinates reporting of content item availability. The file system oberver notifies the whenever a file is added to or removed from the observed cache directory. The NGINX based cache uses the md5 hash of hostname and path of the upstream location of a given resource as a filename. We use thsi knowledge on NGINX' naming convention to detect whether a content item is available in the cache or not.

![Architecture of the Cache Monitor](https://docs.google.com/drawings/d/1UGBatWVdzifi891A5NqvvgDojLQN5_uMloInKmnbO4Y/export/svg)

The basic program flow of the core logic in [monitor.service.ts](src/monitor/monitor.service.ts) is as follows:

- Set listener for messages of type `'new-cache-state'`
- On `'new-cache-state'` message: load cache state (this is very likely an iterative process, as the cache state comprises likely a couple of thousend documents. State API supports pagination which is used in those cases.)
- For each content item in the cache state (/on a cache state item page): if the content item's `urlHash` property equals one of the names of the files in the cache directory, report the content item to be available, else to be missing
- Set listener for file change events of type `'add'` and `'remove'` (i.e. `'unlink'`in the used [chokidar](https://www.npmjs.com/package/chokidar) module)
- On file `'add'`: Set availability of content item with property `'urlHash'` equal to file name (cache hash) to `true`:
  - Will through an error if content item with this `hashUrl` is not known
  - Intermediate files (e.g. file for which the download has not completed) in the cache directory will be ingnored as those do not have the final name as expected by the cache state. Atempts to update the cache state for those files would result in errors in any case.
- On file `'add'`: Set availability of content item with property `'urlHash'` equal to file name (cache hash) to `false`

## Technologie used

- [Nest.js](https://nestjs.com/)

## Install, build, run

**Note:** _Typically you would use the `up.sh` script from the [Platform](../../../5gv-platform) project to install, build and run this service as part of a composite of docker services. Read on if you intend to run the service directly on your host system._

**Prerequestits**: Following software needs to be installed on your host machine in order to execute the subsequent steps.

- [Node.js](https://nodejs.org/en/)
- [NPM](https://www.npmjs.com/)

First, `git clone` this project and change into its root directory. Than run the following command to install its dependencies:

```bash
$ npm install
```

You can than run the service in three different modes.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

With following command you can build a [docker image](https://www.docker.com) for this service. But again, typically you use the startup script `up.sh` of the [Platform](../../../5gv-platform) project to do the job.

```bash
$ docker build -t cache-monitor .
```
