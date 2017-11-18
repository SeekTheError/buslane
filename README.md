# Buslane

[![Coverage Status](https://coveralls.io/repos/github/5app/buslane/badge.svg)](https://coveralls.io/github/5app/buslane)

## Intro

buslane is a cross-service and transparent object.method proxy, using an rpc-lite json/http2 transport.

The need for this lib came about when we decided to move to docker at 5app. I wanted a simple way to remove our direct code dependencies between services. For instance, some services would require the database module directly in order to manipulate our data.

With buslane and its RPC like object proxying, you can call methods on remote objects as if they were in the same context. So there is no need to create specific service endpoints. Just write the configuration and buslane will expose the objects to each other.

This is all still very experimental, so use with caution.

## Config & Usage

__Warning__: This lib can only work if the ``--expose-http2`` is passed to the node process at start time.


I recommend looking at the [tests](https://github.com/5app/buslane/tree/master/test) to understand how the initialization work.
