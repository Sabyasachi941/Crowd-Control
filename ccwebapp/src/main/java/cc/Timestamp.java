package cc;

import javax.persistence.Entity;
import javax.persistence.Id;


@Entity
public class Timestamp {

    @Id
    private long id;

    private int timestamp;
    //change the data type for timestamp to match up with postgres type/joda time idk
    public int getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(int Timestamp) {
        this.timestamp = timestamp;
    }


}
