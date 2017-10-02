# Buslane

## Intro

The need for this lib came about when we decided to move to docker at 5app. I wanted a simple way to remove our direct code dependencies between services. For instance, some services would require the database module directly in order to manipulate our data.

With buslane and its RPC like object proxying, you can can methods on remote objects like they were in the same context. So there is no need to create specific service endpoints. Just write the configuration and buslane will expose the objects to each other.

This is all still very experimental, so use with caution.

## Config & Usage

I recommend looking at the tests to understand how the initialization work.
