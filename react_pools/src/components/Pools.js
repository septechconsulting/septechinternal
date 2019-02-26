import React, {Component} from 'react'
import axios from 'axios'
import Pool from './Pool.js'


export default class Pools extends Component{

  constructor(props){
    super(props)
    this.state={
      showButtons:false,
      currentTable:[],
      blankRows:[],
      failedLoad:false,
      processing:false,
      updateStatus:'',
      showResponse:false,
      status:'',
    }
    this.getPoolTestTable=this.getPoolTestTable.bind(this)
    this.handleClick=this.handleClick.bind(this)
    this.handleSubmit=this.handleSubmit.bind(this)
    this.addPoolRow=this.addPoolRow.bind(this)
    this.updateRows=this.updateRows.bind(this)
    this.submitResults=this.submitResults.bind(this)
  }

  componentWillReceiveProps(nextProps){
    if((this.props.currentRecord!== nextProps.currentRecord || this.props.currentInspection !== nextProps.currentInspection || this.props.currentChecklist !== nextProps.currentChecklist) || (nextProps.currentItemId == "")){
      this.setState({
        currentTable :Object.assign([], [])
      })
    }else if(this.props.currentItemId !== nextProps.currentItemId){
      console.log(this.props.currentRecord)
      console.log(this.props.currentInspection)
      console.log(this.props.currentChecklist)
      this.getPoolTestTable(nextProps.currentItemId)
    }
  }

  getPoolTestTable(itemId){
       axios.get(`https://apis.accela.com/v4/inspections/${this.props.currentInspection}/checklists/${this.props.currentChecklist}/checklistItems/${itemId}/customTables`, this.props.header)
       .then(function(data){
         return data.data.result.filter(table=> table.id=="POOL_LIC-OUTSIDE.cLAB.cPOOL.cSAMPLES")
       }.bind(this))
       .then(function(poolTable){
         var rows= poolTable[0].rows== undefined ? [] : poolTable[0].rows
         this.setState({
           currentTable:Object.assign([], rows),
           showButtons:true
         })
       }.bind(this))
       .catch((error)=>{
         this.setState({
           failedLoad:true
         })
         console.log(`Error getting custom tables for ${itemId}`)
       })
  }

  handleClick(e){
    e.preventDefault()
    this.props.addRow()
  }


  handleSubmit(e){
    e.preventDefault();
    var submitResults=this.state.blankRows
    this.setState({
      processing:true
    })
    this.submitResults()

  }


  addPoolRow(e){
    e.preventDefault(e)
    this.setState({
      blankRows:[...this.state.blankRows, {}]
    })

  }

  updateRows(fields, index){
  this.setState({
    blankRows:[...this.state.blankRows.slice(0,index),
    Object.assign({}, {fields:fields}),
    ...this.state.blankRows.slice(index+1)]
  })
  }

  submitResults(){
    var rows= this.state.blankRows;
    var url=`https://apis.accela.com/v4/inspections/${this.props.currentChecklist}/checklists/${this.props.currentChecklist}/checklistItems/${this.props.currentItemId}/customTables`
     var promises=[]
    rows.forEach((row)=>{
      if("fields" in row && row.fields["save"]){
        promises.push(
          new Promise (function (resolve, reject){
            console.log(`inspection: ${this.props.currentInspection}, checklist: ${this.props.currentChecklist}`);
            let fields={
               "Coliform Results":row.fields["Coliform Results"],
               "E. Coli Results":row.fields["E. Coli Results"],
               "Collection Date":row.fields["Collection Date"],
               "HPC":row.fields["HPC"],
               "Name":row.fields["Name"],
               "Notes":row.fields["Notes"],
               "Sample ID":row.fields["Sample ID"],
               "Valid Results":row.fields["Valid Results"]
             }
             axios.put(url, JSON.stringify([
                    {
                    "id": "POOL_LIC-OUTSIDE.cLAB.cPOOL.cSAMPLES",
                    "rows": [
                    {
                    "action": "add",
                    "fields": fields
                    }
                    ]
                    }
                  ]), this.props.header)
                  .then(function (data){
                     resolve(data)
                   }.bind(this))
                   .catch(error=>{
                     console.log(`error`)
                   })
          }.bind(this))
        )
      }

    })

    Promise.all(promises).then(function(data){
        this.handleResponse(data)
      }.bind(this))
      .then(function(data){
        this.getPoolTestTable(this.props.currentItemId)
      }.bind(this))


  }

  handleResponse(data){
    var responseText="";
    var status="";
    data.forEach(resp=>{
      status=resp.status
      if(status== 200){
        responseText="Sample Results Successfully Submited"
      }else{
        if(status==400){
          responseText="There was an error submitting the requested data"
        }else if (status==401 || status==403) {
          responseText="Not authorized to make this request"
        }else if (status == 500) {
          responseText="Cannot submit request at the time due to a server error"
        }
      }
    })
    this.setState({
      status:status,
      updateStatus:responseText,
      showResponse:true
    })
  }





  render(){
    return(
      <div className="poolscontainer">

      {this.state.blankRows.map((row, index)=>{
          return <Pool manageInput={this.updateRows} sucess={true} index={index} key={index}/>
      })
    }
    {this.state.showButtons ?
    <div className="buttons-container">
    <button className="yellow-button" onClick={this.addPoolRow}>+ ADD POOL SAMPLE</button>
    <button className="yellow-button" onClick={this.handleSubmit}>SUBMIT SAMPLE</button>
    {this.state.showResponse ? <div className={this.state.status == 200 ? "success" : "error"}>{this.state.updateStatus} </div> : null}
      </div> : null}
      <table>
      <tbody>
      <tr>
      <th>Collection Date</th>
      <th>Sample ID</th>
      <th>Valid Sample</th>
      <th>Ecoli</th>
      <th>Hetero</th>
      <th>Coliform</th>
      <th>Comments</th>
      <th>Submitted By</th>
      </tr>
    {this.state.failedLoad ? <tr> <div className="error">There was an error retrieving results for this custom table </div></tr> : null}
      {this.state.currentTable.map((row, index)=>{
          return(
              <tr>
              <td> {row.fields["Collection Date"]} </td>
              <td>  {row.fields["Sample ID"]}</td>
              <td>{row.fields["Valid Results"]}</td>
              <td>{row.fields["E. Coli Results"]}</td>
              <td>{row.fields["HPC"]}</td>
              <td>{row.fields["Coliform Results"]}</td>
              <td>{row.fields["Notes"]}</td>
              <td>{row.fields["Name"]}</td>
              </tr>)
            }
      )}
      </tbody>
      </table>

      </div>
    )
  }

}
