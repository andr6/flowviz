import { Box } from '@mui/material';
import { memo } from 'react';
import { NodeProps } from 'reactflow';

import { NodeContent } from './shared/NodeContent';
import { NodeHandles } from './shared/NodeHandles';
import { NodeHeader } from './shared/NodeHeader';
import { getBaseNodeStyle } from './shared/nodeStyles';

function GenericNode({ data, selected }: NodeProps) {
  const isNewNode = data.isNewNode;
  
  return (
    <Box 
      sx={{
        ...getBaseNodeStyle(data.type, selected, isNewNode),
        overflow: 'visible',
        padding: 2
      }}
    >
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <NodeHeader nodeType={data.type} />
      </Box>

      <NodeContent data={data} />

      <NodeHandles />
    </Box>
  );
}

export default memo(GenericNode);