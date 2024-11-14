import React from "preact/compat";
import Paragraph from "../../public/paragraph.svg";
import List from "../../public/list.svg";
import Picture from "../../public/picture.svg";
import Square from "../../public/square.svg";
import Files from "../../public/files.svg";
import Table from "../../public/table.svg";

interface Tool {
  name: string;
  svg: any;
}

class Toolbox extends React.Component {

  tools: Tool[] = [
    {name: "tool1", svg: Paragraph},
    {name: "tool2", svg: List },
    {name: "tool3", svg: Picture },
    {name: "tool4", svg: Square },
    {name: "tool5", svg: Table },
    {name: "tool6", svg: Files },
  ]; 

  render() {
    return (
      <div name="toolbox">
            {
              this.tools.map((tool) => {
              return (
                <div className="tool" key={tool.name}>
                  <img src={tool.svg} alt={tool.name} />
                </div>
              );
            })
            }
      </div>
    );
  }
}

export default Toolbox;
