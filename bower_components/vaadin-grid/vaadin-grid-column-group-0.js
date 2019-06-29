
    Polymer({
      is: 'vaadin-grid-column-group',

      behaviors: [vaadin.elements.grid.ColumnBaseBehavior],

      properties: {
        _childColumns: {
          value: function() {
            return Polymer.dom(this).querySelectorAll('vaadin-grid-column, vaadin-grid-selection-column');
          }
        },

        /**
         * Flex grow ratio for the column group as the sum of the ratios of its child columns.
         */
        flexGrow: {
          type: Number,
          readOnly: true
        },

        /**
         * Width of the column group as the sum of the widths of its child columns.
         */
        width: {
          type: String,
          readOnly: true
        },

        _visibleChildColumns: Array,

        /**
         * Represents the number of child columns of this group.
         */
        colSpan: {
          type: Number,
          notify: true,
          readOnly: true
        },

        _rootColumns: Array
      },

      observers: [
        '_updateVisibleChildColumns(_childColumns)',
        '_childColumnsChanged(_childColumns)',
        '_flexGrowChanged(flexGrow)',
        '_widthChanged(width)',
        '_frozenChanged(_childColumns, frozen)',
        '_hiddenChanged(hidden)',
        '_visibleChildColumnsChanged(_visibleChildColumns)',
        '_colSpanChanged(colSpan)',
        '_orderChanged(_order, _rootColumns)',
        '_reorderStatusChanged(_reorderStatus, _rootColumns)',
        '_resizableChanged(resizable, _rootColumns)'
      ],

      listeners: {
        'property-changed': '_columnPropChanged'
      },

      attached: function() {
        this._updateFlexAndWidth(this._visibleChildColumns);
        this._addNodeObserver();
      },

      detached: function() {
        Polymer.dom(this).unobserveNodes(this._observer);
      },

      _columnPropChanged: function(e) {
        if (e.detail.path === 'hidden') {
          this._preventHiddenCascade = true;
          this._updateVisibleChildColumns(this._childColumns);
          this._preventHiddenCascade = false;
        }

        if (/flexGrow|width|hidden|_childColumns/.test(e.detail.path)) {
          this._updateFlexAndWidth(this._visibleChildColumns);
        }

        if (e.detail.path === 'frozen') {
          this.frozen = e.detail.value;
        }

        if (e.detail.path === 'lastFrozen') {
          this._lastFrozen = e.detail.value;
        }
      },

      _orderChanged: function(order, rootColumns) {
        if (order) {
          // The parent column order number cascades downwards to it's children
          // so that the resulting order numbering constructs as follows:
          // [             1000              ]
          // [     1100    ] | [     1200    ]
          // [1110] | [1120] | [1210] | [1220]

          // Trailing zeros are counted so we know the level on which we're working on.
          var trailingZeros = /(0+)$/.exec(order).pop().length;

          // In an unlikely situation where a group has more than 9 child columns,
          // the child scope must have 1 digit less...
          var childCountDigits = ~~(Math.log(rootColumns.length) / Math.log(Math.LN10)) + 1;

          // Final scope for the child columns needs to mind both factors.
          var scope = Math.pow(10, trailingZeros - childCountDigits);

          var _rootColumns = rootColumns.slice(0);
          if (_rootColumns[0] && _rootColumns[0]._order) {
            _rootColumns.sort(function(a, b) {
              return a._order - b._order;
            });
          }

          _rootColumns.forEach(function(column, index) {
            column._order = order + ((index + 1) * scope);
          });

          this.fire('property-changed', {path: 'order', value: order});
        }
      },

      _reorderStatusChanged: function(reorderStatus, rootColumns) {
        rootColumns.forEach(function(column) {
          column._reorderStatus = reorderStatus;
        });

        this.fire('property-changed', {path: 'reorderStatus', value: reorderStatus});
      },

      _resizableChanged: function(resizable, rootColumns) {
        rootColumns.forEach(function(column) {
          column.resizable = resizable;
        });

        this.fire('property-changed', {path: 'resizable', value: resizable});
      },

      _updateVisibleChildColumns: function(childColumns) {
        this._visibleChildColumns = childColumns.filter(function(col) {
          return !col.hidden;
        });
      },

      _childColumnsChanged: function(childColumns) {
        if (!this._autoHidden && this.hidden) {
          childColumns.forEach(function(column) {
            column.hidden = true;
          });
          this._updateVisibleChildColumns(childColumns);
        }
        this.fire('property-changed', {path: '_childColumns', value: childColumns});
      },

      _updateFlexAndWidth: function(visibleChildColumns) {
        if (visibleChildColumns.length) {
          this._setWidth('calc(' + visibleChildColumns.reduce(function(prev, curr) {
            return prev += ' + ' + (curr.width || '0px').replace('calc', '');
          }, '').substring(3) + ')');
        } else {
          this._setWidth('0px');
        }

        this._setFlexGrow(visibleChildColumns.reduce(function(prev, curr) {
          return prev + curr.flexGrow;
        }, 0));
      },

      _frozenChanged: function(childColumns, frozen) {
        childColumns.forEach(function(col) {
          col.frozen = frozen;
        });
        this.fire('property-changed', {path: 'frozen', value: frozen});
      },

      _hiddenChanged: function(hidden) {
        if (this._rootColumns && !this._preventHiddenCascade) {
          this._ignoreVisibleChildColumns = true;
          this._rootColumns.forEach(function(column) {
            column.hidden = hidden;
          });
          this._ignoreVisibleChildColumns = false;
        }

        this.fire('property-changed', {path: 'hidden', value: hidden});
      },

      _visibleChildColumnsChanged: function(visibleChildColumns) {
        this._setColSpan(visibleChildColumns.length);

        if (!this._ignoreVisibleChildColumns) {
          if (visibleChildColumns.length === 0) {
            this._autoHidden = this.hidden = true;
          } else if (this.hidden && this._autoHidden) {
            this._autoHidden = this.hidden = false;
          }
        }
      },

      _colSpanChanged: function(colSpan) {
        this.fire('property-changed', {path: 'colSpan', value: colSpan});
      },

      _addNodeObserver: function() {
        this._observer = Polymer.dom(this).observeNodes(function(info) {
          this._rootColumns = Polymer.dom(this).children.filter(function(child) {
            return /column/.test(child.localName);
          });
          var columns = function(node) {
            return (node.nodeType === Node.ELEMENT_NODE && node.localName.indexOf('vaadin-grid-column') === 0);
          };
          if (info.addedNodes.filter(columns).length > 0 ||
            info.removedNodes.filter(columns).length > 0) {
            this._childColumns = Polymer.dom(this).querySelectorAll('vaadin-grid-column');
          }
        }.bind(this));
      }
    });
  