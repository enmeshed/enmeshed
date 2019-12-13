# IMPLEMENTATION NOTES

## Error handling

### Unary

#### Client

##### Send-side

Unary data is sent with the following code from client.js:

```js
    makeUnaryRequest(method, serialize, deserialize, argument, metadata, options, callback) {
        ({ metadata, options, callback } = this.checkOptionalUnaryResponseArguments(metadata, options, callback));
        const call = this[CHANNEL_SYMBOL].createCall(method, options.deadline, options.host, null, options.propagate_flags);
        if (options.credentials) {
            call.setCredentials(options.credentials);
        }
        const message = serialize(argument);
        const writeObj = { message };
        call.sendMetadata(metadata);
        call.write(writeObj);
        call.end();
        this.handleUnaryResponse(call, deserialize, callback);
        return new call_1.ClientUnaryCallImpl(call);
    }
```

A serialization error will cause the call to fail prematurely without sending anything.

##### Receive-side

Any created error object has the Status object { code, details, metadata } assigned to it. Errors resulting from deserialization receive INTERNAL status.

call.cancelWithStatus always creates EMPTY METADATA, and closes the stream without sending anything additional to the Server side.

Unary receives are handled by the following async code:

```js
    handleUnaryResponse(call, deserialize, callback) {
        let responseMessage = null;
        call.on('data', (data) => {
            if (responseMessage != null) {
                call.cancelWithStatus(constants_1.Status.INTERNAL, 'Too many responses received');
            }
            try {
                responseMessage = deserialize(data);
            }
            catch (e) {
                call.cancelWithStatus(constants_1.Status.INTERNAL, 'Failed to parse server response');
            }
        });
        call.on('status', (status) => {
            /* We assume that call emits status after it emits end, and that it
             * accounts for any cancelWithStatus calls up until it emits status.
             * Therefore, considering the above event handlers, status.code should be
             * OK if and only if we have a non-null responseMessage */
            if (status.code === constants_1.Status.OK) {
                callback(null, responseMessage);
            }
            else {
                const error = Object.assign(new Error(status.details), status);
                callback(error);
            }
        });
    }
```

#### Server

If the response is an Error, the "trailer" arg is attached as Metadata to the
status {code, details, metadata} object. If the error object has "code" and "details"
properties, these are used in the sent Status.

If there is an error writing the response, a Status with INTERNAL code is sent
to the client.

When marshalling an error, set the { code, details } props on the
error object appropriately and pass metadata. Metadata should be a grpc.Metadata.

Unary processing starts here:
```js
async function handleUnary(call, handler, metadata) {
    const emitter = new server_call_1.ServerUnaryCallImpl(call, metadata);
    const request = await call.receiveUnaryMessage();
    if (request === undefined || call.cancelled) {
        return;
    }
    emitter.request = request;
    handler.func(emitter, (err, value, trailer, flags) => {
        call.sendUnaryMessage(err, value, trailer, flags);
    });
}
```

The return message is filtered by:
```js
    async sendUnaryMessage(err, value, metadata, flags) {
        if (!metadata) {
            metadata = new metadata_1.Metadata();
        }
        if (err) {
            err.metadata = metadata;
            this.sendError(err);
            return;
        }
        try {
            const response = await this.serializeMessage(value);
            this.write(response);
            this.sendStatus({ code: constants_1.Status.OK, details: 'OK', metadata });
        }
        catch (err) {
            err.code = constants_1.Status.INTERNAL;
            this.sendError(err);
        }
    }

    sendError(error) {
        const status = {
            code: constants_1.Status.UNKNOWN,
            details: 'message' in error ? error.message : 'Unknown Error',
            metadata: 'metadata' in error && error.metadata !== undefined
                ? error.metadata
                : new metadata_1.Metadata(),
        };
        if ('code' in error &&
            typeof error.code === 'number' &&
            Number.isInteger(error.code)) {
            status.code = error.code;
            if ('details' in error && typeof error.details === 'string') {
                status.details = error.details;
            }
        }
        this.sendStatus(status);
    }
```

### Server Streams

#### Client

When a readable stream receives a remote error:

```js
    call.on('status', (status) => {
        if (status.code !== constants_1.Status.OK) {
            const error = Object.assign(new Error(status.details), status);
            stream.emit('error', error);
        }
        stream.emit('status', status);
        statusEmitted = true;
    });
```

An error object is created, assigned the status object { code, details, metadata }
and is emitted as an error event.
