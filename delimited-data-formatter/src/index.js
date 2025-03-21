const dscc = require('@google/dscc');
console.log("v37 Filter visualization initialized - Delimited field filter with configurable delimiter, compact numbers, and header info");

/**
 * Main visualization drawing function
 * This is called whenever the data or configuration changes
 * @param {Object} data - The data object from Looker Studio
 */
function drawViz(data) {
  try {
    
    // Get the container dimensions from Looker Studio
    const width = dscc.getWidth();
    const height = dscc.getHeight();
    
    // Get the dimension field information
    const dimensionField = data.fields.dimID[0];
    
    // Get the delimiter from configuration or use comma as default
    let delimiter = ',';
    if (data.style && data.style.delimiterType && data.style.delimiterType.value) {
      delimiter = data.style.delimiterType.value;
    }
    
    // Check if there's a custom delimiter specified
    if (data.style && data.style.customDelimiter && data.style.customDelimiter.value && 
        data.style.customDelimiter.value.trim() !== '') {
      delimiter = data.style.customDelimiter.value;
    }
    
    // Check if compact number formatting is enabled
    let useCompactNumbers = false;
    if (data.style && data.style.useCompactNumbers && data.style.useCompactNumbers.value !== undefined) {
      useCompactNumbers = data.style.useCompactNumbers.value;
    }
    
    // Check if we should show null values
    let showNullValues = true;
    if (data.style && data.style.showNullValues && data.style.showNullValues.value !== undefined) {
      showNullValues = data.style.showNullValues.value;
    }
    
    // Get the text to display for null values
    let nullDisplayText = "(null)";
    if (data.style && data.style.nullDisplayText && data.style.nullDisplayText.value) {
      nullDisplayText = data.style.nullDisplayText.value;
    }
    
    // Check if we should show selected count and reset link
    let showSelectedCount = true;
    let showResetLink = true;
    let resetLinkText = 'Reset';
    
    if (data.style && data.style.showSelectedCount && data.style.showSelectedCount.value !== undefined) {
      showSelectedCount = data.style.showSelectedCount.value;
    }
    
    if (data.style && data.style.showResetLink && data.style.showResetLink.value !== undefined) {
      showResetLink = data.style.showResetLink.value;
    }
    
    if (data.style && data.style.resetLinkText && data.style.resetLinkText.value) {
      resetLinkText = data.style.resetLinkText.value;
    }
        
    // Extract all unique values from the dimension and store their metrics
    const dimensionMetrics = new Map();
    const individualValueCounts = new Map(); // Track counts for individual values
    const delimitedValues = new Map(); // Track which values appear in delimited fields
    
    // Process all rows to extract unique values and handle delimited fields
    data.tables.DEFAULT.forEach(row => {
      if (row.dimID && row.dimID.length > 0) {
        const dimValue = row.dimID[0];
        // Get the metric value - ensure it's a number
        const metricValue = row.metricID && row.metricID.length > 0 ? Number(row.metricID[0]) : 0;
        
        // Handle null, undefined, or empty values
        const isNullish = dimValue === null || dimValue === undefined || dimValue === '';
        
        // Skip null values if showNullValues is false
        if (!showNullValues && isNullish) {
          return;
        }
        
        // Handle null or undefined values with the configured display text
        const dimValueStr = isNullish ? nullDisplayText : String(dimValue);
        
        // Check if this is a delimited field (contains the delimiter)
        if (!isNullish && String(dimValue).includes(delimiter)) {
          // Split the delimited field and process each value
          const individualValues = dimValueStr.split(delimiter).map(v => v.trim());
          
          // Add each individual value to our tracking
          individualValues.forEach(individualValue => {
            // Skip empty values
            if (!individualValue) return;
            
            // Track that this individual value appears in delimited fields
            if (!delimitedValues.has(individualValue)) {
              delimitedValues.set(individualValue, new Set());
            }
            delimitedValues.get(individualValue).add(dimValueStr);
            
            // Increment the count for this individual value
            if (!individualValueCounts.has(individualValue)) {
              individualValueCounts.set(individualValue, metricValue);
            } else {
              individualValueCounts.set(individualValue, individualValueCounts.get(individualValue) + metricValue);
            }
          });
          
          // Add the full delimited value to our metrics
          if (dimensionMetrics.has(dimValueStr)) {
            dimensionMetrics.set(dimValueStr, dimensionMetrics.get(dimValueStr) + metricValue);
          } else {
            dimensionMetrics.set(dimValueStr, metricValue);
          }
        } else {
          // Single value, add to our metrics
          if (dimensionMetrics.has(dimValueStr)) {
            dimensionMetrics.set(dimValueStr, dimensionMetrics.get(dimValueStr) + metricValue);
          } else {
            dimensionMetrics.set(dimValueStr, metricValue);
          }
          
          // Also track the count for this individual value
          if (!individualValueCounts.has(dimValueStr)) {
            individualValueCounts.set(dimValueStr, metricValue);
          } else {
            individualValueCounts.set(dimValueStr, individualValueCounts.get(dimValueStr) + metricValue);
          }
        }
      }
    });
    
    // Get unique individual values (non-delimited)
    const uniqueIndividualValues = new Set();
    dimensionMetrics.forEach((_, key) => {
      // Include null values (represented by nullDisplayText) if showNullValues is true
      
      // Convert to string to ensure we can use string methods
      const keyStr = String(key);
      if ((keyStr === nullDisplayText && showNullValues) || (!keyStr.includes(delimiter) && keyStr !== '')) {
        uniqueIndividualValues.add(keyStr);
      }
    });
    
    // Convert to sorted array for display - only show individual values, not delimited ones
    const sortedDimensionValues = Array.from(uniqueIndividualValues).sort();
  
    // Add items to the list - start with none selected
    let selectedItems = new Set(); // Start with none selected
    let initiallyAllSelected = false; // Track if we start with all selected
    
    // Check if there's an active filter from Looker Studio
    if (data.interactions && data.interactions.onClick && 
        data.interactions.onClick.value && 
        data.interactions.onClick.value.data) {
      const filterData = data.interactions.onClick.value.data;
      if (filterData.values && filterData.values.length > 0) {
        // There's an active filter, so we should only select those items
        selectedItems.clear();
        initiallyAllSelected = false;
        
        // First, collect all the values from the filter
        const filterValues = new Set();
        filterData.values.forEach(valueArray => {
          if (valueArray && valueArray.length > 0) {
            const value = valueArray[0];
            
            // Handle null, undefined, or empty values
            const isNullish = value === null || value === undefined || value === '';
            
            // Skip null values if showNullValues is false
            if (!showNullValues && isNullish) {
              return;
            }
            
            // Handle null or undefined values with the configured display text
            const valueStr = isNullish ? nullDisplayText : String(value);
            filterValues.add(valueStr);
          }
        });
        
        // Then, select only the individual values that are explicitly in the filter
        // Do NOT automatically select other values from delimited fields
        sortedDimensionValues.forEach(value => {
          if (filterValues.has(value)) {
            selectedItems.add(value);
          }
        });
        
        // Check if we ended up with all items selected again
        if (selectedItems.size === sortedDimensionValues.length) {
          initiallyAllSelected = true;
        }
      }
    }
    
    // Function to sort values with selected items at the top
    function getSortedValues() {
      // If all items are selected or none are selected, just use alphabetical order
      if (selectedItems.size === 0 || selectedItems.size === sortedDimensionValues.length) {
        return [...sortedDimensionValues];
      }
      
      // Otherwise, put selected items at the top
      const selected = [];
      const unselected = [];
      
      sortedDimensionValues.forEach(value => {
        if (selectedItems.has(value)) {
          selected.push(value);
        } else {
          unselected.push(value);
        }
      });
      
      // Sort each group alphabetically
      selected.sort();
      unselected.sort();
      
      // Return combined array with selected items first
      return [...selected, ...unselected];
    }
    
    // Get the sorted values with selected items at the top
    const displayValues = getSortedValues();
    
    // Extract style configuration with defaults
    const styles = {
      // General appearance
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: '14px',
      backgroundColor: '#ffffff',
      
      // Header section
      headerBackgroundColor: '#f8f9fa',
      headerTextColor: '#202124',
      headerFontWeight: '500',
      headerBorderColor: '#dadce0',
      
      // Search section
      searchBackgroundColor: '#ffffff',
      searchTextColor: '#202124',
      searchPlaceholderText: 'Type to search',
      searchBorderColor: '#dadce0',
      
      // List items
      itemBackgroundColor: '#ffffff',
      itemHoverColor: '#f1f3f4',
      itemTextColor: '#202124',
      itemBorderColor: '#dadce0',
      
      // Accent elements
      accentColor: '#1a73e8',
      onlyButtonText: 'only',
      onlyButtonFontSize: '12px',
      checkboxColor: '#1a73e8'
    };
    
    // Helper function to extract color from style object
    function getColor(styleObj) {
      if (styleObj && styleObj.value && styleObj.value.color) {
        return styleObj.value.color;
      }
      return null;
    }
    
    // Apply custom styles if available in the config
    if (data.style) {
      console.log("Style configuration:", data.style);
      
      const styleUpdates = {
        // General appearance
        fontFamily: ['fontFamily', 'value'],
        fontSize: ['fontSize', 'value', val => val + 'px'],
        backgroundColor: ['backgroundColor', 'color', getColor],
        
        // Header section
        headerBackgroundColor: ['headerBackgroundColor', 'color', getColor],
        headerTextColor: ['headerTextColor', 'color', getColor],
        headerFontWeight: ['headerFontWeight', 'value'],
        headerBorderColor: ['headerBorderColor', 'color', getColor],
        
        // Search section
        searchBackgroundColor: ['searchBackgroundColor', 'color', getColor],
        searchTextColor: ['searchTextColor', 'color', getColor],
        searchPlaceholderText: ['searchPlaceholderText', 'value'],
        searchBorderColor: ['searchBorderColor', 'color', getColor],
        
        // List items
        itemBackgroundColor: ['itemBackgroundColor', 'color', getColor],
        itemHoverColor: ['itemHoverColor', 'color', getColor],
        itemTextColor: ['itemTextColor', 'color', getColor],
        itemBorderColor: ['itemBorderColor', 'color', getColor],
        
        // Accent elements
        accentColor: ['accentColor', 'color', getColor],
        onlyButtonText: ['onlyButtonText', 'value'],
        onlyButtonFontSize: ['onlyButtonFontSize', 'value', val => val + 'px'],
        checkboxColor: ['checkboxColor', 'color', getColor]
      };

      // Apply each style update
      Object.entries(styleUpdates).forEach(([styleKey, [configKey, valueKey, transform = val => val]]) => {
        const configValue = data.style[configKey];
        if (configValue && configValue[valueKey] !== undefined) {
          styles[styleKey] = transform(configValue[valueKey]);
        }
      });
    }
    
    console.log("Applied styles:", styles);
    
    // Create the main container for our filter UI
    const filterContainer = document.createElement('div');
    filterContainer.id = 'lookerStudioFilterContainer';
    filterContainer.style.position = 'absolute';
    filterContainer.style.top = '0';
    filterContainer.style.left = '0';
    filterContainer.style.width = width + 'px';
    filterContainer.style.height = height + 'px';
    filterContainer.style.backgroundColor = styles.backgroundColor;
    filterContainer.style.fontFamily = styles.fontFamily;
    filterContainer.style.fontSize = styles.fontSize;
    filterContainer.style.boxSizing = 'border-box';
    filterContainer.style.display = 'flex';
    filterContainer.style.flexDirection = 'column';
    filterContainer.style.padding = '0';
    filterContainer.style.margin = '0';
    filterContainer.style.border = `1px solid ${styles.headerBorderColor}`;
    filterContainer.style.borderRadius = '4px';
    filterContainer.style.overflow = 'hidden';
    
    // Create the header section
    const headerSection = document.createElement('div');
    headerSection.className = 'header';
    headerSection.style.display = 'flex';
    headerSection.style.alignItems = 'center';
    headerSection.style.padding = '8px 16px';
    headerSection.style.borderBottom = `1px solid ${styles.headerBorderColor}`;
    headerSection.style.backgroundColor = styles.headerBackgroundColor;
    headerSection.style.boxSizing = 'border-box';
    
    // Create the dimension name label for the header
    const headerDimensionLabel = document.createElement('div');
    headerDimensionLabel.className = 'dimension-name';
    headerDimensionLabel.style.fontWeight = styles.headerFontWeight;
    headerDimensionLabel.style.fontSize = styles.fontSize;
    headerDimensionLabel.style.color = styles.headerTextColor;
    headerDimensionLabel.style.flex = '1';
    headerDimensionLabel.style.whiteSpace = 'nowrap';
    headerDimensionLabel.style.overflow = 'hidden';
    headerDimensionLabel.style.textOverflow = 'ellipsis';
    
    // Set the dimension name text with selected count if enabled
    if (showSelectedCount) {
      // Count only the checked items (not the expanded filter values)
      const selectedCount = selectedItems.size;
      
      // Always show the count of checked items
      headerDimensionLabel.textContent = `${dimensionField.name} (${formatMetricValue(selectedCount)})`;
    } else {
      headerDimensionLabel.textContent = dimensionField.name;
    }
    
    // Add elements to the header
    headerSection.appendChild(headerDimensionLabel);
    
    // Create and add the reset link if enabled
    if (showResetLink) {
      const resetLink = document.createElement('a');
      resetLink.textContent = resetLinkText;
      resetLink.href = '#';
      resetLink.style.color = styles.accentColor;
      resetLink.style.fontSize = styles.fontSize;
      resetLink.style.marginLeft = '16px';
      resetLink.style.textDecoration = 'none';
      resetLink.style.cursor = 'pointer';
      resetLink.style.flexShrink = '0';
      
      // Add click handler for reset
      resetLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Reset to default state (no items selected)
        selectedItems.clear();
        updateCheckboxes();
        updateHeaderLabel();
        applyFilter();
        refreshItemsList();
      });
      
      headerSection.appendChild(resetLink);
    }
    
    // Create the search bar section
    const searchBarSection = document.createElement('div');
    searchBarSection.className = 'search-bar';
    searchBarSection.style.padding = '8px 16px';
    searchBarSection.style.display = 'flex';
    searchBarSection.style.alignItems = 'center';
    searchBarSection.style.borderBottom = `1px solid ${styles.searchBorderColor}`;
    searchBarSection.style.backgroundColor = styles.searchBackgroundColor;
    searchBarSection.style.boxSizing = 'border-box';
    
    // Create the search icon
    const searchIcon = document.createElement('div');
    searchIcon.className = 'search-icon';
    searchIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" fill="${styles.searchTextColor}">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
      </svg>
    `;
    searchIcon.style.marginRight = '8px';
    searchIcon.style.flexShrink = '0';
    
    // Create the search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = styles.searchPlaceholderText;
    searchInput.style.border = 'none';
    searchInput.style.outline = 'none';
    searchInput.style.width = '100%';
    searchInput.style.fontSize = styles.fontSize;
    searchInput.style.color = styles.searchTextColor;
    searchInput.style.backgroundColor = 'transparent';
    searchInput.style.boxSizing = 'border-box';
    
    // Add elements to the search bar
    searchBarSection.appendChild(searchIcon);
    searchBarSection.appendChild(searchInput);
    
    // Create the items list container
    const itemsListContainer = document.createElement('div');
    itemsListContainer.className = 'items-list-container';
    itemsListContainer.style.flex = '1';
    itemsListContainer.style.overflowY = 'auto';
    itemsListContainer.style.padding = '0';
    itemsListContainer.style.boxSizing = 'border-box';
    itemsListContainer.style.backgroundColor = styles.itemBackgroundColor;
    
    // Create the items list
    const itemsList = document.createElement('div');
    itemsList.className = 'items-list';
    itemsList.style.boxSizing = 'border-box';
    
    // Format the metric value for display
    function formatMetricValue(value) {
      // If the value is a number, format it appropriately
      if (typeof value === 'number') {
        if (useCompactNumbers) {
          // Format as compact number (10k, 5M, etc.)
          if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
          } else if (value >= 1000) {
            return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
          } else {
            return Math.round(value).toLocaleString();
          }
        } else {
          // Format with commas
          return Math.round(value).toLocaleString();
        }
      }
      return value;
    }
    
    displayValues.forEach(value => {
      const itemRow = document.createElement('div');
      itemRow.className = 'item';
      itemRow.style.display = 'flex';
      itemRow.style.alignItems = 'center';
      itemRow.style.padding = '8px 16px';
      itemRow.style.borderBottom = `1px solid ${styles.itemBorderColor}`;
      itemRow.style.cursor = 'pointer';
      itemRow.style.boxSizing = 'border-box';
      itemRow.style.backgroundColor = styles.itemBackgroundColor;
      
      // Add hover effect
      itemRow.addEventListener('mouseover', () => {
        itemRow.style.backgroundColor = styles.itemHoverColor;
      });
      
      itemRow.addEventListener('mouseout', () => {
        itemRow.style.backgroundColor = styles.itemBackgroundColor;
      });
      
      // Create the checkbox for this item
      const itemCheckbox = document.createElement('input');
      itemCheckbox.type = 'checkbox';
      itemCheckbox.checked = selectedItems.has(value);
      itemCheckbox.style.marginRight = '8px';
      itemCheckbox.style.flexShrink = '0';
      itemCheckbox.style.accentColor = styles.checkboxColor;
      
      // Create the item label container for flexible layout
      const itemLabelContainer = document.createElement('div');
      itemLabelContainer.style.flex = '1';
      itemLabelContainer.style.display = 'flex';
      itemLabelContainer.style.alignItems = 'center';
      itemLabelContainer.style.justifyContent = 'space-between';
      itemLabelContainer.style.marginRight = '8px';
      itemLabelContainer.style.overflow = 'hidden';

      // Create the item label
      const itemLabel = document.createElement('span');
      itemLabel.textContent = value;
      itemLabel.style.fontSize = styles.fontSize;
      itemLabel.style.color = styles.itemTextColor;
      itemLabel.style.whiteSpace = 'nowrap';
      itemLabel.style.overflow = 'hidden';
      itemLabel.style.textOverflow = 'ellipsis';
      itemLabel.style.marginRight = '8px';

      // Create the metric label with the count for this value
      const metricLabel = document.createElement('span');
      const count = individualValueCounts.get(value) || 0;
      metricLabel.textContent = formatMetricValue(count);
      metricLabel.style.fontSize = styles.fontSize;
      metricLabel.style.color = '#70757a'; // Metric color in gray
      metricLabel.style.whiteSpace = 'nowrap';
      metricLabel.style.flexShrink = '0';

      // Add labels to the container
      itemLabelContainer.appendChild(itemLabel);
      itemLabelContainer.appendChild(metricLabel);

      // Disable the "only" button
      // const onlyButton = document.createElement('span');
      // onlyButton.textContent = styles.onlyButtonText;
      // onlyButton.style.color = styles.accentColor;
      // onlyButton.style.fontSize = styles.onlyButtonFontSize;
      // onlyButton.style.cursor = 'pointer';
      // onlyButton.style.marginLeft = '8px';
      // onlyButton.style.opacity = '0'; // Hide by default
      // onlyButton.style.transition = 'opacity 0.2s';
      // onlyButton.style.flexShrink = '0';
      
      // // Show "only" on hover
      // itemRow.addEventListener('mouseover', () => {
      //   onlyButton.style.opacity = '1';
      // });
      
      // itemRow.addEventListener('mouseout', () => {
      //   onlyButton.style.opacity = '0';
      // });
      
      // Add click handlers
      itemCheckbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (itemCheckbox.checked) {
          selectedItems.add(value);
        } else {
          selectedItems.delete(value);
        }
        updateSelectAllCheckbox();
        applyFilter();
        
        // Refresh the list to move selected items to the top
        refreshItemsList();
      });
      
      // Make the entire row clickable to toggle the checkbox
      itemRow.addEventListener('click', (e) => {
        // Only toggle if we didn't click on the checkbox
        if (e.target !== itemCheckbox) {
          // Toggle only this checkbox
          itemCheckbox.checked = !itemCheckbox.checked;
          if (itemCheckbox.checked) {
            selectedItems.add(value);
          } else {
            selectedItems.delete(value);
          }
          updateSelectAllCheckbox();
          applyFilter();
          
          // Refresh the list to move selected items to the top
          refreshItemsList();
          
          // Prevent event bubbling to avoid multiple selections
          e.stopPropagation();
        }
      });
      
      // onlyButton.addEventListener('click', (e) => {
      //   e.stopPropagation(); // Prevent triggering the row click
      //   selectedItems.clear();
      //   selectedItems.add(value);
      //   updateCheckboxes();
      //   applyFilter();
      // });
      
      // Add elements to the item row
      itemRow.appendChild(itemCheckbox);
      itemRow.appendChild(itemLabelContainer);
      // itemRow.appendChild(onlyButton);
      
      // Add the item row to the list
      itemsList.appendChild(itemRow);
    });
    
    // Add the items list to its container
    itemsListContainer.appendChild(itemsList);
    
    // Add all sections to the filter container
    filterContainer.appendChild(headerSection);
    filterContainer.appendChild(searchBarSection);
    filterContainer.appendChild(itemsListContainer);
    
    // Add the filter container to the document
    document.body.appendChild(filterContainer);
    
    // Function to update the header label with selected count
    function updateHeaderLabel() {
      if (showSelectedCount) {
        // Count only the checked items (not the expanded filter values)
        const selectedCount = selectedItems.size;
        
        // Always show the count of checked items
        headerDimensionLabel.textContent = `${dimensionField.name} (${formatMetricValue(selectedCount)})`;
      } else {
        headerDimensionLabel.textContent = dimensionField.name;
      }
    }
    
    // Function to update the "Select All" checkbox state - disabled for now
    function updateSelectAllCheckbox() {
      // Check if all items are selected
      const allSelected = selectedItems.size === sortedDimensionValues.length;
      // Check if some (but not all) items are selected
      const someSelected = selectedItems.size > 0 && selectedItems.size < sortedDimensionValues.length;
      
      // selectAllCheckbox.checked = allSelected;
      // selectAllCheckbox.indeterminate = someSelected;
      updateHeaderLabel();
    }
    
    // Function to update all checkboxes based on selected items
    function updateCheckboxes() {
      const checkboxes = itemsList.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox, index) => {
        checkbox.checked = selectedItems.has(sortedDimensionValues[index]);
      });
      updateSelectAllCheckbox();
    }
    
    // Add event listener for the "Select All" checkbox - disabled for now
    // selectAllCheckbox.addEventListener('change', () => {
    //   if (selectAllCheckbox.checked) {
    //     // Select all items
    //     sortedDimensionValues.forEach(value => {
    //       selectedItems.add(value);
    //     });
    //   } else {
    //     // Deselect all items
    //     selectedItems.clear();
    //   }
    //   updateCheckboxes();
    //   applyFilter();
    //   
    //   // Refresh the list to update the order
    //   refreshItemsList();
    // });
    
    // Add event listener for the search input
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const items = itemsList.querySelectorAll('.item');
      
      items.forEach((item, index) => {
        // Get the value from the item's label text
        const itemLabel = item.querySelector('span');
        const value = itemLabel ? itemLabel.textContent : '';
        
        if (value.toLowerCase().includes(searchTerm)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
    
    // Function to apply the filter based on selected items
    function applyFilter() {
      if (selectedItems.size === 0) {
        // If nothing is selected, clear the filter
        dscc.clearInteraction('onClick');
      } else if (selectedItems.size === sortedDimensionValues.length) {
        // If everything is selected, also clear the filter
        dscc.clearInteraction('onClick');
      } else {
        // Apply filter with selected values
        console.log("Applying filter with values:", Array.from(selectedItems));
        
        // Create a list of values to filter on, including both individual values
        // and any delimited fields containing those values
        const filterValues = new Set();
        
        // Add all selected individual values
        selectedItems.forEach(value => {
          // Convert nullDisplayText back to actual null for the filter
          const actualValue = value === nullDisplayText ? null : value;
          filterValues.add(actualValue);
          
          // Also add any delimited fields containing this value
          if (value !== nullDisplayText && delimitedValues.has(value)) {
            delimitedValues.get(value).forEach(delimitedField => {
              filterValues.add(delimitedField);
            });
          }
        });
        
        // Create the filter interaction data object
        const filterPayload = {
          concepts: [dimensionField.id],
          values: Array.from(filterValues).map(value => [value])
        };
        
      
        dscc.sendInteraction('onClick', dscc.InteractionType.FILTER, filterPayload);
      }
      
      // Update the header label with the correct count (number of checked items)
      updateHeaderLabel();
    }
    
    // Function to refresh the items list with the current selection state
    function refreshItemsList() {
      // Clear the current list
      while (itemsList.firstChild) {
        itemsList.removeChild(itemsList.firstChild);
      }
      
      // Get the updated sorted values
      const updatedDisplayValues = getSortedValues();
      
      // Recreate the list with the new order
      updatedDisplayValues.forEach(value => {
        const itemRow = document.createElement('div');
        itemRow.className = 'item';
        itemRow.style.display = 'flex';
        itemRow.style.alignItems = 'center';
        itemRow.style.padding = '8px 16px';
        itemRow.style.borderBottom = `1px solid ${styles.itemBorderColor}`;
        itemRow.style.cursor = 'pointer';
        itemRow.style.boxSizing = 'border-box';
        itemRow.style.backgroundColor = styles.itemBackgroundColor;
        
        // Add hover effect
        itemRow.addEventListener('mouseover', () => {
          itemRow.style.backgroundColor = styles.itemHoverColor;
        });
        
        itemRow.addEventListener('mouseout', () => {
          itemRow.style.backgroundColor = styles.itemBackgroundColor;
        });
        
        // Create the checkbox for this item
        const itemCheckbox = document.createElement('input');
        itemCheckbox.type = 'checkbox';
        itemCheckbox.checked = selectedItems.has(value);
        itemCheckbox.style.marginRight = '8px';
        itemCheckbox.style.flexShrink = '0';
        itemCheckbox.style.accentColor = styles.checkboxColor;
        
        // Create the item label container for flexible layout
        const itemLabelContainer = document.createElement('div');
        itemLabelContainer.style.flex = '1';
        itemLabelContainer.style.display = 'flex';
        itemLabelContainer.style.alignItems = 'center';
        itemLabelContainer.style.justifyContent = 'space-between';
        itemLabelContainer.style.marginRight = '8px';
        itemLabelContainer.style.overflow = 'hidden';

        // Create the item label
        const itemLabel = document.createElement('span');
        itemLabel.textContent = value;
        itemLabel.style.fontSize = styles.fontSize;
        itemLabel.style.color = styles.itemTextColor;
        itemLabel.style.whiteSpace = 'nowrap';
        itemLabel.style.overflow = 'hidden';
        itemLabel.style.textOverflow = 'ellipsis';
        itemLabel.style.marginRight = '8px';

        // Create the metric label with the count for this value
        const metricLabel = document.createElement('span');
        const count = individualValueCounts.get(value) || 0;
        metricLabel.textContent = formatMetricValue(count);
        metricLabel.style.fontSize = styles.fontSize;
        metricLabel.style.color = '#70757a'; // Metric color in gray
        metricLabel.style.whiteSpace = 'nowrap';
        metricLabel.style.flexShrink = '0';

        // Add labels to the container
        itemLabelContainer.appendChild(itemLabel);
        itemLabelContainer.appendChild(metricLabel);
        
        // Add click handlers
        itemCheckbox.addEventListener('change', (e) => {
          e.stopPropagation();
          if (itemCheckbox.checked) {
            selectedItems.add(value);
          } else {
            selectedItems.delete(value);
          }
          updateSelectAllCheckbox();
          applyFilter();
          
          // Refresh the list to move selected items to the top
          refreshItemsList();
        });
        
        // Make the entire row clickable to toggle the checkbox
        itemRow.addEventListener('click', (e) => {
          // Only toggle if we didn't click on the checkbox
          if (e.target !== itemCheckbox) {
            // Toggle only this checkbox
            itemCheckbox.checked = !itemCheckbox.checked;
            if (itemCheckbox.checked) {
              selectedItems.add(value);
            } else {
              selectedItems.delete(value);
            }
            updateSelectAllCheckbox();
            applyFilter();
            
            // Refresh the list to move selected items to the top
            refreshItemsList();
            
            // Prevent event bubbling to avoid multiple selections
            e.stopPropagation();
          }
        });
        
        // Add elements to the item row
        itemRow.appendChild(itemCheckbox);
        itemRow.appendChild(itemLabelContainer);
        
        // Add the item row to the list
        itemsList.appendChild(itemRow);
      });
    }
    
    // Handle window resize events
    window.addEventListener('resize', () => {
      const newWidth = dscc.getWidth();
      const newHeight = dscc.getHeight();
      
      // Update container dimensions
      filterContainer.style.width = newWidth + 'px';
      filterContainer.style.height = newHeight + 'px';
    });
    
    console.log("Delimited field filter UI created successfully");
  } catch (error) {
    console.error("Error in drawViz:", error);
  }
}

// Subscribe to data updates from Looker Studio
// The objectTransform parameter ensures we get the data in the format we expect
dscc.subscribeToData(drawViz, {transform: dscc.objectTransform});