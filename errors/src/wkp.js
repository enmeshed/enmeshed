
// Install precompiled protocols into Protobuf database.
// THIS FILE IS AUTO-GENERATED

export function installProtos(loader) {

  loader("google/rpc/code.proto",{"nested":{"google":{"nested":{"rpc":{"options":{"go_package":"google.golang.org/genproto/googleapis/rpc/code;code","java_multiple_files":true,"java_outer_classname":"CodeProto","java_package":"com.google.rpc","objc_class_prefix":"RPC"},"nested":{"Code":{"values":{"OK":0,"CANCELLED":1,"UNKNOWN":2,"INVALID_ARGUMENT":3,"DEADLINE_EXCEEDED":4,"NOT_FOUND":5,"ALREADY_EXISTS":6,"PERMISSION_DENIED":7,"UNAUTHENTICATED":16,"RESOURCE_EXHAUSTED":8,"FAILED_PRECONDITION":9,"ABORTED":10,"OUT_OF_RANGE":11,"UNIMPLEMENTED":12,"INTERNAL":13,"UNAVAILABLE":14,"DATA_LOSS":15}}}}}}}})

  loader("google/rpc/error_details.proto",{"nested":{"google":{"nested":{"rpc":{"options":{"go_package":"google.golang.org/genproto/googleapis/rpc/errdetails;errdetails","java_multiple_files":true,"java_outer_classname":"ErrorDetailsProto","java_package":"com.google.rpc","objc_class_prefix":"RPC"},"nested":{"RetryInfo":{"fields":{"retryDelay":{"type":"google.protobuf.Duration","id":1}}},"DebugInfo":{"fields":{"stackEntries":{"rule":"repeated","type":"string","id":1},"detail":{"type":"string","id":2}}},"QuotaFailure":{"fields":{"violations":{"rule":"repeated","type":"Violation","id":1}},"nested":{"Violation":{"fields":{"subject":{"type":"string","id":1},"description":{"type":"string","id":2}}}}},"PreconditionFailure":{"fields":{"violations":{"rule":"repeated","type":"Violation","id":1}},"nested":{"Violation":{"fields":{"type":{"type":"string","id":1},"subject":{"type":"string","id":2},"description":{"type":"string","id":3}}}}},"BadRequest":{"fields":{"fieldViolations":{"rule":"repeated","type":"FieldViolation","id":1}},"nested":{"FieldViolation":{"fields":{"field":{"type":"string","id":1},"description":{"type":"string","id":2}}}}},"RequestInfo":{"fields":{"requestId":{"type":"string","id":1},"servingData":{"type":"string","id":2}}},"ResourceInfo":{"fields":{"resourceType":{"type":"string","id":1},"resourceName":{"type":"string","id":2},"owner":{"type":"string","id":3},"description":{"type":"string","id":4}}},"Help":{"fields":{"links":{"rule":"repeated","type":"Link","id":1}},"nested":{"Link":{"fields":{"description":{"type":"string","id":1},"url":{"type":"string","id":2}}}}},"LocalizedMessage":{"fields":{"locale":{"type":"string","id":1},"message":{"type":"string","id":2}}}}}}}}})

  loader("google/rpc/status.proto",{"nested":{"google":{"nested":{"rpc":{"options":{"go_package":"google.golang.org/genproto/googleapis/rpc/status;status","java_multiple_files":true,"java_outer_classname":"StatusProto","java_package":"com.google.rpc","objc_class_prefix":"RPC"},"nested":{"Status":{"fields":{"code":{"type":"int32","id":1},"message":{"type":"string","id":2},"details":{"rule":"repeated","type":"google.protobuf.Any","id":3}}}}}}}}})

  loader("mesh/MarshalledError.proto",{"nested":{"mesh":{"nested":{"MarshalledError":{"fields":{"errorClass":{"type":"string","id":1},"stack":{"type":"string","id":2},"cause":{"type":"google.rpc.Status","id":3},"fields":{"type":"google.protobuf.Struct","id":4}}}}}}})

  loader("mesh/MarshalledErrorDetail.proto",{"nested":{"mesh":{"nested":{"MarshalledErrorDetail":{"fields":{"errorDetailClass":{"type":"string","id":1},"fields":{"type":"google.protobuf.Struct","id":4}}}}}}})

}
