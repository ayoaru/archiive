import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 130 },
    { field: 'brand', headerName: 'Brand', width: 130 },
    { field: 'category', headerName: 'Category', width: 130 },
    { field: 'season', headerName: 'Season', width: 130 },
    { field: 'style', headerName: 'Style', width: 130 },
    { field: 'primary_color', headerName: 'Primary Color', width: 130 },
    { field: 'secondary_color', headerName: 'Secondary Color', width: 130 },
    { field: 'fit', headerName: 'Fit', width: 130 },
];

const paginationModel = { page: 0, pageSize: 5 };

export default function DataTable() {
    const [closetList, setClosetList] = useState([]);

  useEffect(() => {
    getClosetItem();
  }, []);

  const getClosetItem = async () => {
    try {
      const response = await axios.get("http://localhost:5000/closet/read");
      setClosetList(response.data);
      console.log(response.data);
    } catch (e) {
      console.log(e);
    }
  };


  return (
    <Paper sx={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={closetList.map((item) => ({ id: item._id, ...item }))}
        columns={columns}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        checkboxSelection
        sx={{ border: 0 }}
      />
    </Paper>
  );
}
