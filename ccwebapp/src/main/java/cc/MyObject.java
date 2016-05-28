package cc;

//class made to return from sql query - as it is not already a domain
//
public class MyObject {

    private Long sumPeople;

    private Integer date;

    public void setSumPeople(Long sumPeople){
        this.sumPeople = sumPeople;
    }

    public Long getSumPeople(){return sumPeople;}

    public void setDate(Integer date){
        this.date = date;
    }

    public Integer getDate(){return date;}

    @Override
    public String toString(){
        String s = "["+sumPeople+", "+date+"]";
        return s;
    }



}
