'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _types = require('../types');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Just-in-time calculates and caches size and position information for a collection of cells.
 */

var CellSizeAndPositionManager = function () {

  // Used in deferred mode to track which cells have been queued for measurement.

  // Cache of size and position data for cells, mapped by cell index.
  // Note that invalid values may exist in this map so only rely on cells up to this._lastMeasuredIndex
  function CellSizeAndPositionManager(_ref) {
    var cellCount = _ref.cellCount,
        cellSize = _ref.cellSize,
        estimatedCellSize = _ref.estimatedCellSize;
    (0, _classCallCheck3.default)(this, CellSizeAndPositionManager);
    this._cellSizeAndPositionData = {};
    this._lastMeasuredIndex = -1;
    this._lastBatchedIndex = -1;

    this._cellCount = cellCount;
    this._cellSize = cellSize;
    this._estimatedCellSize = estimatedCellSize;
  }

  // Measurements for cells up to this index can be trusted; cells afterward should be estimated.


  (0, _createClass3.default)(CellSizeAndPositionManager, [{
    key: '_getSize',
    value: function _getSize(index) {
      return typeof this._cellSize === 'function' ? this._cellSize({ index: index }) : this._cellSize;
    }
  }, {
    key: 'areOffsetsAdjusted',
    value: function areOffsetsAdjusted() {
      return false;
    }
  }, {
    key: 'configure',
    value: function configure(_ref2) {
      var cellCount = _ref2.cellCount,
          estimatedCellSize = _ref2.estimatedCellSize,
          cellSize = _ref2.cellSize;

      this._cellCount = cellCount;
      this._estimatedCellSize = estimatedCellSize;
      this._cellSize = cellSize;
    }
  }, {
    key: 'getCellCount',
    value: function getCellCount() {
      return this._cellCount;
    }
  }, {
    key: 'getEstimatedCellSize',
    value: function getEstimatedCellSize() {
      return this._estimatedCellSize;
    }
  }, {
    key: 'getLastMeasuredIndex',
    value: function getLastMeasuredIndex() {
      return this._lastMeasuredIndex;
    }
  }, {
    key: 'getOffsetAdjustment',
    value: function getOffsetAdjustment() {
      return 0;
    }
  }, {
    key: '_validateIndex',
    value: function _validateIndex(index) {
      if (index < 0 || index >= this._cellCount) {
        throw Error('Requested index ' + index + ' is outside of range 0..' + this._cellCount);
      }
    }

    /**
     * This method returns the size and position of a cell without the need to iterate over,
     * and cache, all cells up to the passed index.
     * In case the CellSize is a number, we can just multiply to find the offset.
     */

  }, {
    key: '_arithmeticallyCalculateSizeAndPosition',
    value: function _arithmeticallyCalculateSizeAndPosition(index) {
      this._validateIndex(index);

      if (typeof this._cellSize !== 'number') {
        throw Error('_calculateSizeAndPositionByHeight should only be called if CellSize is a number.\n         Current CellSize type is ' + (0, _typeof3.default)(this._cellSize) + '.');
      }

      return {
        offset: this._cellSize * index,
        size: this._cellSize
      };
    }

    /**
     * This method returns the size and position for the cell at the specified index.
     * It just-in-time calculates (or used cached values) for cells leading up to the index.
     */

  }, {
    key: '_iterativelyCalculateSizeAndPosition',
    value: function _iterativelyCalculateSizeAndPosition(index) {
      this._validateIndex(index);

      if (index > this._lastMeasuredIndex) {
        var lastMeasuredCellSizeAndPosition = this.getSizeAndPositionOfLastMeasuredCell();
        var _offset = lastMeasuredCellSizeAndPosition.offset + lastMeasuredCellSizeAndPosition.size;

        for (var i = this._lastMeasuredIndex + 1; i <= index; i++) {
          var _size = this._getSize(i);

          // undefined or NaN probably means a logic error in the size getter.
          // null means we're using CellMeasurer and haven't yet measured a given index.
          if (_size === undefined || isNaN(_size)) {
            throw Error('Invalid size returned for cell ' + i + ' of value ' + _size);
          } else if (_size === null) {
            this._cellSizeAndPositionData[i] = {
              offset: _offset,
              size: 0
            };

            this._lastBatchedIndex = index;
          } else {
            this._cellSizeAndPositionData[i] = {
              offset: _offset,
              size: _size
            };

            _offset += _size;

            this._lastMeasuredIndex = index;
          }
        }
      }

      return this._cellSizeAndPositionData[index];
    }

    /**
     * This method returns the size and position for the cell at the specified index.
     * It decides on the correct calculation method according to the type of CellSize.
     */

  }, {
    key: 'getSizeAndPositionOfCell',
    value: function getSizeAndPositionOfCell(index) {
      this._validateIndex(index);

      if (typeof this._cellSize === 'number') {
        return this._arithmeticallyCalculateSizeAndPosition(index);
      }

      return this._iterativelyCalculateSizeAndPosition(index);
    }
  }, {
    key: 'getSizeAndPositionOfLastMeasuredCell',
    value: function getSizeAndPositionOfLastMeasuredCell() {
      return this._lastMeasuredIndex >= 0 ? this._cellSizeAndPositionData[this._lastMeasuredIndex] : {
        offset: 0,
        size: 0
      };
    }

    /**
     * Total size of all cells being measured.
     * This value will be completely estimated initially.
     * As cells are measured, the estimate will be updated.
     * If cellSize is numeric, just calculate the height.
     */

  }, {
    key: 'getTotalSize',
    value: function getTotalSize() {
      if (typeof this._cellSize === 'number') {
        return this._cellCount * this._cellSize;
      }

      var lastMeasuredCellSizeAndPosition = this.getSizeAndPositionOfLastMeasuredCell();
      var totalSizeOfMeasuredCells = lastMeasuredCellSizeAndPosition.offset + lastMeasuredCellSizeAndPosition.size;
      var numUnmeasuredCells = this._cellCount - this._lastMeasuredIndex - 1;
      var totalSizeOfUnmeasuredCells = numUnmeasuredCells * this._estimatedCellSize;
      return totalSizeOfMeasuredCells + totalSizeOfUnmeasuredCells;
    }

    /**
     * Determines a new offset that ensures a certain cell is visible, given the current offset.
     * If the cell is already visible then the current offset will be returned.
     * If the current offset is too great or small, it will be adjusted just enough to ensure the specified index is visible.
     *
     * @param align Desired alignment within container; one of "auto" (default), "start", or "end"
     * @param containerSize Size (width or height) of the container viewport
     * @param currentOffset Container's current (x or y) offset
     * @param totalSize Total size (width or height) of all cells
     * @return Offset to use to ensure the specified cell is visible
     */

  }, {
    key: 'getUpdatedOffsetForIndex',
    value: function getUpdatedOffsetForIndex(_ref3) {
      var _ref3$align = _ref3.align,
          align = _ref3$align === undefined ? 'auto' : _ref3$align,
          containerSize = _ref3.containerSize,
          currentOffset = _ref3.currentOffset,
          targetIndex = _ref3.targetIndex;

      if (containerSize <= 0) {
        return 0;
      }

      var datum = this.getSizeAndPositionOfCell(targetIndex);
      var maxOffset = datum.offset;
      var minOffset = maxOffset - containerSize + datum.size;

      var idealOffset = void 0;

      switch (align) {
        case 'start':
          idealOffset = maxOffset;
          break;
        case 'end':
          idealOffset = minOffset;
          break;
        case 'center':
          idealOffset = maxOffset - (containerSize - datum.size) / 2;
          break;
        default:
          idealOffset = Math.max(minOffset, Math.min(maxOffset, currentOffset));
          break;
      }

      var totalSize = this.getTotalSize();

      return Math.max(0, Math.min(totalSize - containerSize, idealOffset));
    }
  }, {
    key: 'getVisibleCellRange',
    value: function getVisibleCellRange(params) {
      var containerSize = params.containerSize,
          offset = params.offset;


      var totalSize = this.getTotalSize();

      if (totalSize === 0) {
        return {};
      }

      var maxOffset = offset + containerSize;
      var start = this._findNearestCell(offset);

      var datum = this.getSizeAndPositionOfCell(start);
      offset = datum.offset + datum.size;

      var stop = start;

      while (offset < maxOffset && stop < this._cellCount - 1) {
        stop++;

        offset += this.getSizeAndPositionOfCell(stop).size;
      }

      return {
        start: start,
        stop: stop
      };
    }

    /**
     * Clear all cached values for cells after the specified index.
     * This method should be called for any cell that has changed its size.
     * It will not immediately perform any calculations; they'll be performed the next time getSizeAndPositionOfCell() is called.
     */

  }, {
    key: 'resetCell',
    value: function resetCell(index) {
      this._lastMeasuredIndex = Math.min(this._lastMeasuredIndex, index - 1);
    }
  }, {
    key: '_binarySearch',
    value: function _binarySearch(high, low, offset) {
      while (low <= high) {
        var middle = low + Math.floor((high - low) / 2);
        var _currentOffset = this.getSizeAndPositionOfCell(middle).offset;

        if (_currentOffset === offset) {
          return middle;
        } else if (_currentOffset < offset) {
          low = middle + 1;
        } else if (_currentOffset > offset) {
          high = middle - 1;
        }
      }

      if (low > 0) {
        return low - 1;
      } else {
        return 0;
      }
    }
  }, {
    key: '_exponentialSearch',
    value: function _exponentialSearch(index, offset) {
      var interval = 1;

      while (index < this._cellCount && this.getSizeAndPositionOfCell(index).offset < offset) {
        index += interval;
        interval *= 2;
      }

      return this._binarySearch(Math.min(index, this._cellCount - 1), Math.floor(index / 2), offset);
    }
  }, {
    key: '_arithmeticallyCalculateNearesetCell',
    value: function _arithmeticallyCalculateNearesetCell(offset) {
      if (typeof this._cellSize !== 'number') {
        throw Error('_arithmeticallyCalculateNearesetCell should only be called if CellSize is a number.\n         Current CellSize type is ' + (0, _typeof3.default)(this._cellSize) + '.');
      }

      // We need to return the nearest, yet lowest cell, so floor it
      // We might get a very high offset so just return count - 1 is such a case, which
      // mean offset to the last item
      return Math.min(Math.floor(offset / this._cellSize), this._cellCount - 1);
    }

    /**
     * Searches for the cell (index) nearest the specified offset.
     *
     * If no exact match is found the next lowest cell index will be returned.
     * This allows partially visible cells (with offsets just before/above the fold) to be visible.
     */

  }, {
    key: '_findNearestCell',
    value: function _findNearestCell(offset) {
      if (isNaN(offset)) {
        throw Error('Invalid offset ' + offset + ' specified');
      }

      // Our search algorithms find the nearest match at or below the specified offset.
      // So make sure the offset is at least 0 or no match will be found.
      offset = Math.max(0, offset);

      // If cell size is a numeric value, we can calc the lowest cell instead of running
      // search algorithms
      if (typeof this._cellSize === 'number') {
        return this._arithmeticallyCalculateNearesetCell(offset);
      }

      var lastMeasuredCellSizeAndPosition = this.getSizeAndPositionOfLastMeasuredCell();
      var lastMeasuredIndex = Math.max(0, this._lastMeasuredIndex);

      if (lastMeasuredCellSizeAndPosition.offset >= offset) {
        // If we've already measured cells within this range just use a binary search as it's faster.
        return this._binarySearch(lastMeasuredIndex, 0, offset);
      } else {
        // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
        // The exponential search avoids pre-computing sizes for the full set of cells as a binary search would.
        // The overall complexity for this approach is O(log n).
        return this._exponentialSearch(lastMeasuredIndex, offset);
      }
    }
  }]);
  return CellSizeAndPositionManager;
}();

exports.default = CellSizeAndPositionManager;