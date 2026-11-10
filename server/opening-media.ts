// Workers uses this stream's size for the outgoing Content-Length.
declare const FixedLengthStream: new (size: number) => ReadableWritablePair<Uint8Array, Uint8Array>;

function sliceStream(body: ReadableStream<Uint8Array>, skip: number, length: number) {
  const reader = body.getReader();
  let remaining = length;
  const slice = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const {value, done} = await reader.read();
        if (done) throw new Error('Opening media ended before the requested range');
        if (skip >= value.length) {
          skip -= value.length;
          continue;
        }
        const part = value.subarray(skip, skip + remaining);
        skip = 0;
        remaining -= part.length;
        controller.enqueue(part);
        if (remaining === 0) {
          controller.close();
          await reader.cancel();
        }
        return;
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  return typeof FixedLengthStream === 'undefined' ? slice : slice.pipeThrough(new FixedLengthStream(length));
}

function matchesIfRange(validator: string | null, headers: Headers) {
  if (!validator) return true;
  if (validator.startsWith('"')) return validator === headers.get('ETag');
  const modified = headers.get('Last-Modified');
  return modified !== null && Date.parse(modified) === Date.parse(validator);
}

// Some static asset bindings ignore Range. Safari probes the first two bytes
// before requesting the rest. Supply a genuine single-range response there.
export function openingMediaResponse(request: Request, asset: Response, size: number): Response {
  if (asset.status !== 200 || !['GET', 'HEAD'].includes(request.method)) return asset;

  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(size));
  const range = request.headers.get('Range')?.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (request.method === 'HEAD' || !asset.body || !range || (!range[1] && !range[2]) ||
      !matchesIfRange(request.headers.get('If-Range'), headers)) {
    return new Response(asset.body, {status: 200, headers});
  }

  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
  if (start >= size || end < start) {
    void asset.body.cancel().catch(() => {});
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, {status: 416, headers});
  }

  const length = end - start + 1;
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(length));
  const wholeAsset = length === size && asset.headers.get('Content-Length') === String(size);
  const body = wholeAsset ? asset.body : sliceStream(asset.body, start, length);
  return new Response(body, {status: 206, headers});
}
