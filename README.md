# Wiki.js Update Companion

This docker image provides automated upgrade to latest Wiki.js versions from the Administration Area.

It's part of the [DigitalOcean prebuilt Wiki.js droplet](https://marketplace.digitalocean.com/apps/wiki-js?refcode=5f7445bfa4d0) and is installed when following the [Ubuntu installation instructions](https://docs.requarks.io/install/ubuntu).

## Usage

When a new version of Wiki.js is available, go the **System** page in the **Administration Area** of your Wiki.js installation.

Simply click the **Perform Upgrade** button to perform the upgrade.

## Technical Reference

The wiki-update-companion container exposes a small HTTP API to the Wiki.js container *(and only the container, not to the host)*.

By sending a POST request to `http://wiki-update-companion/upgrade`, the following actions are taken:

1. Stop and remove the `wiki` container
1. Pull the latest wiki image
1. Recreate the `wiki` container using the same settings as the previous container

The major version to use for the upgrade can be specified by adding it to the URL, e.g.:
```
http://wiki-update-companion/upgrade/3
```
The default is `2` if not provided.

For security reasons, this mechanism is not part of the main Wiki.js docker image, because it would require the Docker socket to be mapped into the container. A compromised Wiki.js instance would effectively give full access to other containers on the host. By using a separate isolated container, which only exposes a single HTTP endpoint internally, this potential security risk is eliminated.

The wiki-update-companion container must:

- Have the hostname `wiki-update-companion`
- Be on the same network as the `wiki` container
- Have the host `/var/run/docker.sock` socket mapped to the container in the same location
