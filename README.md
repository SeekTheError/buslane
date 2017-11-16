# Buslane

## Intro

buslane is a cross-service and transparent object.method proxy, using an rpc-lite json/http2 transport.

The need for this lib came about when we decided to move to docker at 5app. I wanted a simple way to remove our direct code dependencies between services.

With buslane and its RPC like object proxying, you can call methods on remote objects as if they were in the same context. So there is no need to create specific service endpoints either. Just write the configuration and buslane will expose the objects to each other.

This is all still very experimental, so use with caution, I sure am.

## Config & Usage

__Warning__: This lib can only work if the ``--expose-http2`` is passed to the node process at start time.

I recommend looking at the [tests](https://github.com/5app/buslane/tree/master/test) to understand how the initialization work.

## Test

build and run with docker:

```
docker build -t buslane . && docker run buslane
```


## SSL

By default buslane only provide a self signed cert that will only work with localhost. This default certificate is not for production use. 

To generate the ssl certs for a particular host(the one your service will run on, make sure you replace $HOST of course):

    openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=$HOST' -keyout ssl/key.pem -out ssl/certificate.pem

Then make sure you provision the service with the right path to the righ keys:

```
const config = {name, shared_api_key: 'test'};
	config.map = [
		{name: 'argo', port: 11211, ingresses: ['boat'], ssl_key_path, ssl_cert_path},
		{name: 'jason', port: 11311, ingresses: []},
	];

```
