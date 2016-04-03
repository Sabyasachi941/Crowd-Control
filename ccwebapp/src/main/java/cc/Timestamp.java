package cc;

import javax.persistence.Entity;
import javax.persistence.Id;


@Entity
public class Timestamp {

    @Id
    private Integer id;

    private Integer timestamp;
    //change the data type for timestamp to match up with postgres type/joda time idk
    public Integer getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Integer timestamp) {
        this.timestamp = timestamp;
    }

    public Integer getId() { return id; }

    public void setId(Integer id) {this.id = id; }

}
