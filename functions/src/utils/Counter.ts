/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { v4 } from "uuid";
import { FieldValue, getFirestore, DocumentReference } from "firebase-admin/firestore";

const db = getFirestore();
const SHARD_COLLECTION_ID = "_counter_shards_";

export class Counter {
  shards: any;
  notifyPromise: any;
  doc: DocumentReference;
  field: string;
  db: FirebaseFirestore.Firestore;
  shardId: any;
  /**
   * Constructs a sharded counter object that references to a field
   * in a document that is a counter.
   *
   * @param doc A reference to a document with a counter field.
   * @param field A path to a counter field in the above document.
   */
  constructor(refDoc: any, field: string) {
    this.shards = {};
    this.notifyPromise = null;
    this.doc = refDoc;
    this.field = field;
    this.db = db;
    this.shardId = getShardId();

    const shardsRef = this.db.collection(this.doc.path + "/" + SHARD_COLLECTION_ID);
    this.shards[this.doc.path] = 0;
    this.shards[this.db.doc(shardsRef.path + "/"+ + this.shardId).path] = 0;
    this.shards[this.db.doc(shardsRef.path + "/" + "\t" + this.shardId.slice(0, 4)).path] = 0;
    this.shards[this.db.doc(shardsRef.path + "/" + "\t\t" + this.shardId.slice(0, 3)).path] = 0;
    this.shards[this.db.doc(shardsRef.path + "/" + "\t\t\t" + this.shardId.slice(0, 2)).path] = 0;
    this.shards[this.db.doc(shardsRef.path + "/" + "\t\t\t\t" + this.shardId.slice(0, 1)).path] = 0;
  }

  /**
   * Get latency compensated view of the counter.
   *
   * All local increments will be reflected in the counter even if the main
   * counter hasn't been updated yet.
   */
  async get() {
    const shards = this.db.collection(this.doc.path + '/' +  SHARD_COLLECTION_ID)
    const ref = await shards.get()
    return ref.docs.reduce((a, b) => {
      return a + (b.data()[this.field] || 0)
    }, 0)
  }

  /**
   * Listen to latency compensated view of the counter.
   *
   * All local increments to this counter will be immediately visible in the
   * snapshot.
   */
  onSnapshot(observable) {
    Object.keys(this.shards).forEach((path) => {
      this.db.doc(path).onSnapshot((snap) => {
        this.shards[snap.ref.path] = snap.get(this.field) || 0;
        if (this.notifyPromise !== null) return;
        this.notifyPromise = schedule(() => {
          const sum = Object.values(this.shards).reduce((a: number, b: number) => a + b, 0);
          observable({
            exists: true,
            data: () => sum,
          });
          this.notifyPromise = null;
        });
      })
    });
  }

  /**
   * Increment the counter by a given value.
   *
   * e.g.
   *  
   * counter.incrementBy(1);
   */
  async incrementBy(val: number) {
    const _increment = FieldValue.increment(val);
    const update: any = this.field
      .split(".")
      .reverse()
      .reduce((value: any, name: string) => ({ [name]: value }), _increment);

    const _doc = this.db.doc(this.doc.path + "/" + SHARD_COLLECTION_ID + "/" + this.shardId)
    _doc.set(update, { merge: true });

    const value = await this.get()
    return this.doc.set({ [this.field]: value }, { merge: true })
  }

  async decreaseBy(val: number) {
    const _increment = FieldValue.increment(val * -1);
    const update = this.field
      .split(".")
      .reverse()
      .reduce((value: any, name: string) => ({ [name]: value }), _increment);

    const _doc = this.db.doc(this.doc.path + "/" + SHARD_COLLECTION_ID + "/" + this.shardId)
    _doc.set(update, { merge: true });

    const value = await this.get()
    return this.doc.set({ [this.field]: value }, { merge: true })
  }

  /**
   * Access the assigned shard directly. Useful to update multiple counters
   * at the same time, batches or transactions.
   *
   * e.g.
   * const counter = new sharded.Counter(db.doc("path/counter"), "");
   * const shardRef = counter.shard();
   * shardRef.set({"counter1", firestore.FieldValue.Increment(1),
   *               "counter2", firestore.FieldValue.Increment(1));
   */
  shard() {
    return this.doc.collection(SHARD_COLLECTION_ID).doc(this.shardId);
  }
};

async function schedule(func) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const result = func();
      resolve(result);
    }, 0);
  });
}

function getShardId() {
  const shardId = v4();
  return shardId;
}