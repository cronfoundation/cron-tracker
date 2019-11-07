exports.ids = [1];
exports.modules = {

/***/ 335:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: external "react"
var external_react_ = __webpack_require__(0);

// EXTERNAL MODULE: external "reakit"
var external_reakit_ = __webpack_require__(133);

// EXTERNAL MODULE: external "lodash"
var external_lodash_ = __webpack_require__(3);
var external_lodash_default = /*#__PURE__*/__webpack_require__.n(external_lodash_);

// EXTERNAL MODULE: external "rxjs/operators"
var operators_ = __webpack_require__(5);

// EXTERNAL MODULE: external "apollo-client"
var external_apollo_client_ = __webpack_require__(141);

// EXTERNAL MODULE: external "rxjs"
var external_rxjs_ = __webpack_require__(7);

// CONCATENATED MODULE: ./packages/neotracker-shared-web-next/src/utils/observeQuery.ts


function isResolvedQueryResult(result) {
  return result.type === 'resolved';
}
function isUnresolvedQueryResult(result) {
  return result.type === 'unresolved';
}
const observeQuery = ({
  monitor,
  apollo,
  query,
  variables,
  fetchPolicy = 'cache-and-network',
  notifyOnNetworkStatusChange = false
}) => external_rxjs_["Observable"].create(observer => {
  const queryObservable$ = apollo.watchQuery({
    query,
    variables,
    fetchPolicy,
    errorPolicy: 'all',
    fetchResults: true,
    notifyOnNetworkStatusChange,
    context: {
      monitor
    }
  });

  const next = () => {
    const currentResult = queryObservable$.currentResult();
    const {
      data,
      errors,
      loading,
      networkStatus,
      partial
    } = currentResult;
    let {
      error
    } = currentResult;

    if (errors !== undefined && errors.length > 0) {
      error = new external_apollo_client_["ApolloError"]({
        graphQLErrors: errors
      });
    }

    if (partial) {
      observer.next({
        type: 'unresolved',
        data,
        variables: variables,
        loading,
        error,
        networkStatus
      });
    } else {
      observer.next({
        type: 'resolved',
        data: data,
        variables: variables,
        loading,
        error,
        networkStatus
      });
    }
  };

  let subscription;

  const unsubscribe = () => {
    if (subscription !== undefined) {
      subscription.unsubscribe();
      subscription = undefined;
    }
  };

  const resubscribe = () => {
    unsubscribe();
    const lastError = queryObservable$.getLastError();
    const lastResult = queryObservable$.getLastResult(); // If lastError is set, the observable will immediately
    // send it, causing the stream to terminate on initialization.
    // We clear everything here and restore it afterward to
    // make sure the new subscription sticks.

    queryObservable$.resetLastResults();
    subscribe();
    Object.assign(queryObservable$, {
      lastError,
      lastResult
    });
  };

  const subscribe = () => {
    subscription = queryObservable$.subscribe({
      next: () => {
        next();
      },
      error: error => {
        resubscribe(); // If it has graphQLErrors it's an ApolloError and is already captured as data.
        // Throw other errors.

        if (!error.hasOwnProperty('graphQLErrors')) {
          throw error;
        }

        next();
      },
      complete: observer.complete
    });
  };

  subscribe();
  next();
  return () => {
    unsubscribe();
  };
});
// EXTERNAL MODULE: ./packages/neotracker-shared-web-next/src/components/render/FromStream.tsx
var FromStream = __webpack_require__(142);

// EXTERNAL MODULE: ./packages/neotracker-shared-web-next/src/components/render/WithAppContext.tsx
var WithAppContext = __webpack_require__(115);

// CONCATENATED MODULE: ./packages/neotracker-shared-web-next/src/components/render/Query.tsx







function getObserveQueryOptions({
  appContext: {
    apollo,
    monitor
  },
  query,
  variables,
  notifyOnNetworkStatusChange = false,
  fetchPolicy = 'cache-and-network'
}) {
  return {
    apollo,
    monitor,
    query,
    variables: variables,
    fetchPolicy,
    notifyOnNetworkStatusChange
  };
}

class Query_QueryBase extends external_react_["Component"] {
  constructor(props) {
    super(props);
    this.mutableResult$ = observeQuery(getObserveQueryOptions(props));
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.appContext.apollo !== nextProps.appContext.apollo || this.props.appContext.monitor !== nextProps.appContext.monitor || this.props.query !== nextProps.query || this.props.notifyOnNetworkStatusChange !== nextProps.notifyOnNetworkStatusChange || !external_lodash_default.a.isEqual(this.props.variables, nextProps.variables)) {
      this.mutableResult$ = observeQuery(getObserveQueryOptions(nextProps));
    }
  }

  render() {
    return external_react_["createElement"](FromStream["a" /* FromStream */], {
      "props$": this.mutableResult$
    }, this.props.children);
  }

}

const makeQuery = ({
  query,
  fetchNextData
}) => {
  class Query extends external_react_["Component"] {
    static async fetchData(appContext, variables) {
      const result = await observeQuery(getObserveQueryOptions({
        appContext,
        query,
        variables,
        fetchPolicy: 'cache-first'
      })).pipe(Object(operators_["map"])(value => {
        if (value.error !== undefined) {
          throw value.error;
        }

        return value;
      }), Object(operators_["filter"])(isResolvedQueryResult), Object(operators_["take"])(1)).toPromise();

      if (fetchNextData !== undefined) {
        await fetchNextData(appContext, result);
      }
    }

    render() {
      return external_react_["createElement"](WithAppContext["b" /* WithAppContext */], null, appContext => external_react_["createElement"](Query_QueryBase, Object.assign({}, this.props, {
        query: query,
        appContext: appContext
      }), this.props.children));
    }

  }

  return Query;
};
// CONCATENATED MODULE: ./packages/neotracker-shared-web-next/src/pages/Home.tsx
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Home", function() { return Home; });



const ErrorBox = Object(external_reakit_["styled"])(external_reakit_["Box"]).withConfig({
  displayName: "Home__ErrorBox",
  componentId: "sc-119h7vf-0"
})(["background-color:red;color:black;width:00;"]);
const HomeQuery = makeQuery({
  query: {
    "kind": "Document",
    "definitions": [{
      "kind": "OperationDefinition",
      "operation": "query",
      "name": {
        "kind": "Name",
        "value": "HomeQuery"
      },
      "variableDefinitions": [],
      "directives": [],
      "selectionSet": {
        "kind": "SelectionSet",
        "selections": [{
          "kind": "Field",
          "alias": {
            "kind": "Name",
            "value": "first"
          },
          "name": {
            "kind": "Name",
            "value": "block"
          },
          "arguments": [{
            "kind": "Argument",
            "name": {
              "kind": "Name",
              "value": "index"
            },
            "value": {
              "kind": "IntValue",
              "value": "0"
            }
          }],
          "directives": [],
          "selectionSet": {
            "kind": "SelectionSet",
            "selections": [{
              "kind": "Field",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": [],
              "directives": []
            }, {
              "kind": "Field",
              "name": {
                "kind": "Name",
                "value": "hash"
              },
              "arguments": [],
              "directives": []
            }]
          }
        }, {
          "kind": "Field",
          "alias": {
            "kind": "Name",
            "value": "second"
          },
          "name": {
            "kind": "Name",
            "value": "block"
          },
          "arguments": [{
            "kind": "Argument",
            "name": {
              "kind": "Name",
              "value": "index"
            },
            "value": {
              "kind": "IntValue",
              "value": "1"
            }
          }],
          "directives": [],
          "selectionSet": {
            "kind": "SelectionSet",
            "selections": [{
              "kind": "Field",
              "name": {
                "kind": "Name",
                "value": "id"
              },
              "arguments": [],
              "directives": []
            }, {
              "kind": "Field",
              "name": {
                "kind": "Name",
                "value": "hash"
              },
              "arguments": [],
              "directives": []
            }]
          }
        }]
      }
    }],
    "loc": {
      "start": 0,
      "end": 158,
      "source": {
        "body": "\n    query HomeQuery {\n      first: block(index: 0) {\n        id\n        hash\n      }\n      second: block(index: 1) {\n        id\n        hash\n      }\n    }\n  ",
        "name": "GraphQL request",
        "locationOffset": {
          "line": 1,
          "column": 1
        }
      }
    },
    "id": "b2b8fb6dc0e2e2d49ad676ed625451496d5aa5d606e26a72ee046c40bc57b1f0"
  }
});
function Home() {
  return external_react_["createElement"](HomeQuery, null, ({
    data,
    error
  }) => {
    if (data.first !== undefined || data.second !== undefined) {
      const first = data.first == undefined ? undefined : external_react_["createElement"](external_reakit_["Box"], null, data.first.hash);
      const second = data.second == undefined ? undefined : external_react_["createElement"](external_reakit_["Box"], null, data.second.hash);
      return external_react_["createElement"](external_react_["Fragment"], null, first, second);
    }

    if (error) {
      return external_react_["createElement"](ErrorBox, null, "Error!");
    }

    return external_react_["createElement"](external_reakit_["Box"], null, "Loading...");
  });
}

(function (Home) {
  Home.fetchDataForRoute = async appContext => {
    await HomeQuery.fetchData(appContext);
  };
})(Home || (Home = {}));

/***/ })

};;
//# sourceMappingURL=1.js.map